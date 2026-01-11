"""SEC EDGAR adapter for filings and company data."""
from datetime import date, datetime
from typing import Any

from app.adapters.base import BaseAdapter, Filing, InstrumentCandidate, InstrumentProfile
from app.core.config import settings
from app.core.resilience import rate_limiter


class SECEdgarAdapter(BaseAdapter):
    """Adapter for SEC EDGAR data.

    SEC EDGAR is the official source for all SEC filings.

    Endpoints:
    - Submissions: https://data.sec.gov/submissions/CIK{cik}.json
    - Company search: https://www.sec.gov/cgi-bin/browse-edgar
    - Ticker to CIK: https://www.sec.gov/files/company_tickers.json

    Requirements:
    - User-Agent header required
    - Rate limit: 10 requests/second

    Limitations:
    - None (official source)
    """

    BASE_URL = "https://data.sec.gov"
    SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"

    def __init__(self) -> None:
        super().__init__()
        # SEC allows 10 requests per second
        rate_limiter.register(self.source_name, settings.edgar_rps * 60)

    @property
    def source_name(self) -> str:
        return "sec_edgar"

    @property
    def timeout(self) -> float:
        return 45.0  # SEC can be slow

    def _headers(self) -> dict[str, str]:
        """Get required headers for SEC requests."""
        return {"User-Agent": settings.sec_user_agent}

    async def search_instruments(
        self, query: str, limit: int = 10
    ) -> list[InstrumentCandidate]:
        """Search for companies in SEC database."""
        # Use the company tickers file for search
        url = "https://www.sec.gov/files/company_tickers.json"

        try:
            response = await self._request("GET", url, headers=self._headers())
            data = response.json()

            candidates = []
            query_upper = query.upper()

            for _, company in data.items():
                ticker = company.get("ticker", "")
                title = company.get("title", "")
                cik = str(company.get("cik_str", "")).zfill(10)

                # Simple matching
                if query_upper in ticker.upper() or query_upper in title.upper():
                    candidates.append(
                        InstrumentCandidate(
                            ticker=ticker,
                            name=title,
                            security_type="equity",
                            source_id=cik,
                        )
                    )

                if len(candidates) >= limit:
                    break

            return candidates

        except Exception:
            return []

    async def get_profile(self, cik: str) -> InstrumentProfile | None:
        """Get company profile from SEC."""
        # Pad CIK to 10 digits
        padded_cik = cik.zfill(10)
        url = f"{self.BASE_URL}/submissions/CIK{padded_cik}.json"

        try:
            response = await self._request("GET", url, headers=self._headers())
            data = response.json()

            # Get primary ticker from tickers list
            tickers = data.get("tickers", [])
            ticker = tickers[0] if tickers else None

            return InstrumentProfile(
                ticker=ticker or cik,
                name=data.get("name", ""),
                security_type="equity",
                cik=padded_cik,
                extra={
                    "sic": data.get("sic"),
                    "sic_description": data.get("sicDescription"),
                    "fiscal_year_end": data.get("fiscalYearEnd"),
                    "state": data.get("stateOfIncorporation"),
                },
            )

        except Exception:
            return None

    async def get_daily_bars(self, ticker: str, start: date, end: date) -> list:
        """SEC doesn't provide price data."""
        return []

    async def get_filings(
        self, cik: str, form_types: list[str], limit: int = 20
    ) -> list[Filing]:
        """Get SEC filings for a company.

        Args:
            cik: SEC Central Index Key (with or without leading zeros)
            form_types: List of form types to filter (e.g., ["10-K", "10-Q"])
            limit: Maximum number of filings to return

        Returns:
            List of Filing objects sorted by date descending
        """
        # Pad CIK to 10 digits
        padded_cik = cik.zfill(10)
        url = f"{self.BASE_URL}/submissions/CIK{padded_cik}.json"

        response = await self._request("GET", url, headers=self._headers())
        data = response.json()

        return self._parse_filings(data, padded_cik, form_types, limit)

    def _parse_filings(
        self,
        data: dict[str, Any],
        cik: str,
        form_types: list[str],
        limit: int,
    ) -> list[Filing]:
        """Parse SEC submissions response."""
        filings: list[Filing] = []

        recent = data.get("filings", {}).get("recent", {})

        accession_numbers = recent.get("accessionNumber", [])
        forms = recent.get("form", [])
        filing_dates = recent.get("filingDate", [])
        primary_documents = recent.get("primaryDocument", [])
        primary_doc_descriptions = recent.get("primaryDocDescription", [])

        # Normalize form types for comparison
        form_types_upper = [f.upper() for f in form_types] if form_types else []

        for i in range(len(accession_numbers)):
            form = forms[i] if i < len(forms) else ""

            # Filter by form type if specified
            if form_types_upper and form.upper() not in form_types_upper:
                continue

            accession = accession_numbers[i]
            filing_date_str = filing_dates[i] if i < len(filing_dates) else ""
            primary_doc = primary_documents[i] if i < len(primary_documents) else ""
            description = primary_doc_descriptions[i] if i < len(primary_doc_descriptions) else ""

            # Parse filing date
            try:
                filing_date = date.fromisoformat(filing_date_str)
            except ValueError:
                continue

            # Build document URL
            accession_no_dashes = accession.replace("-", "")
            doc_url = (
                f"https://www.sec.gov/Archives/edgar/data/{cik.lstrip('0')}/"
                f"{accession_no_dashes}/{primary_doc}"
            )

            filings.append(
                Filing(
                    accession_number=accession,
                    form_type=form,
                    filing_date=filing_date,
                    cik=cik,
                    primary_document=primary_doc,
                    primary_doc_url=doc_url,
                    title=description or form,
                    description=description,
                )
            )

            if len(filings) >= limit:
                break

        return filings

    async def get_company_tickers(self) -> dict[str, dict[str, Any]]:
        """Fetch the complete SEC company tickers file.

        Returns:
            Dict mapping ticker to {cik, title}
        """
        url = "https://www.sec.gov/files/company_tickers.json"
        response = await self._request("GET", url, headers=self._headers())
        data = response.json()

        result = {}
        for _, company in data.items():
            ticker = company.get("ticker", "")
            if ticker:
                result[ticker.upper()] = {
                    "cik": str(company.get("cik_str", "")).zfill(10),
                    "title": company.get("title", ""),
                }

        return result
