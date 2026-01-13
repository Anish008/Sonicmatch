"""
Headphones Image URL Generator

Generates safe, stable Wikimedia Commons search URLs for each headphone entry.

Strategy:
- Uses Wikimedia Commons MediaSearch URLs (legally safe, no scraping)
- Combines brand + model for accurate search results
- URL-encodes headphone names and appends "headphones" for better search accuracy
- Deterministic: same input always produces same output

Usage:
    python generate_image_urls.py

Output:
    headphones_with_image_urls.csv
"""

import csv
import urllib.parse
from pathlib import Path


def detect_name_columns(headers: list[str]) -> tuple[str | None, str | None]:
    """
    Detect the best columns to use for headphone name.

    Priority:
    1. brand + model combination
    2. Single 'name' or 'headphone' column

    Returns:
        Tuple of (brand_col, model_col) or (name_col, None)
    """
    headers_lower = [h.lower() for h in headers]

    # Check for brand + model combination (preferred)
    brand_col = None
    model_col = None

    for i, h in enumerate(headers_lower):
        if h in ('brand', 'manufacturer', 'make'):
            brand_col = headers[i]
        elif h in ('model', 'product', 'sku'):
            model_col = headers[i]

    if brand_col and model_col:
        return (brand_col, model_col)

    # Fallback: single name column
    for i, h in enumerate(headers_lower):
        if h in ('name', 'headphone', 'headphone_name', 'product_name', 'title'):
            return (headers[i], None)

    return (None, None)


def normalize_name(name: str) -> str:
    """
    Normalize headphone name for URL encoding.

    - Strips whitespace
    - Ensures string type
    - Removes problematic characters
    """
    if not isinstance(name, str):
        name = str(name)

    # Strip and normalize whitespace
    name = ' '.join(name.split())

    return name


def generate_wikimedia_url(headphone_name: str) -> str:
    """
    Generate a Wikimedia Commons search URL for the headphone.

    Format: https://commons.wikimedia.org/w/index.php?search=<ENCODED_NAME>+headphones&type=image

    This is a search landing page URL (not a direct image URL), which is:
    - Legally safe (no hotlinking)
    - Stable (search URLs don't change)
    - User-friendly (shows multiple image options)
    """
    # Normalize the name
    normalized = normalize_name(headphone_name)

    # Create search query: "Brand Model headphones"
    search_query = f"{normalized} headphones"

    # URL-encode the query
    encoded_query = urllib.parse.quote_plus(search_query)

    # Build the Wikimedia Commons search URL
    url = f"https://commons.wikimedia.org/w/index.php?search={encoded_query}&type=image"

    return url


def get_headphone_name(row: dict, brand_col: str | None, model_col: str | None) -> str:
    """
    Extract or construct the headphone name from a row.
    """
    if brand_col and model_col:
        brand = row.get(brand_col, '').strip()
        model = row.get(model_col, '').strip()
        return f"{brand} {model}"
    elif brand_col:
        return row.get(brand_col, '').strip()
    else:
        # Fallback: try common column names
        for key in ['name', 'headphone', 'product']:
            if key in row:
                return row[key].strip()
        return ''


def process_csv(input_path: Path, output_path: Path) -> dict:
    """
    Process the headphones CSV and add image URLs.

    Returns:
        Statistics dict with processing info
    """
    stats = {
        'total_rows': 0,
        'urls_generated': 0,
        'brand_col': None,
        'model_col': None,
        'errors': []
    }

    # Read input CSV
    with open(input_path, 'r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        headers = reader.fieldnames

        if not headers:
            raise ValueError("CSV file has no headers")

        # Detect name columns
        brand_col, model_col = detect_name_columns(headers)
        stats['brand_col'] = brand_col
        stats['model_col'] = model_col

        if not brand_col:
            raise ValueError(
                f"Could not detect headphone name columns. "
                f"Available columns: {headers}"
            )

        # Prepare output headers (preserve original + add image_url)
        output_headers = list(headers) + ['image_url']

        rows = []
        for row in reader:
            stats['total_rows'] += 1

            # Get headphone name
            headphone_name = get_headphone_name(row, brand_col, model_col)

            if not headphone_name:
                stats['errors'].append(f"Row {stats['total_rows']}: Empty headphone name")
                row['image_url'] = ''
            else:
                # Generate Wikimedia search URL
                row['image_url'] = generate_wikimedia_url(headphone_name)
                stats['urls_generated'] += 1

            rows.append(row)

    # Write output CSV
    with open(output_path, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=output_headers)
        writer.writeheader()
        writer.writerows(rows)

    return stats


def main():
    """Main entry point."""
    # Define paths
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'public' / 'data'

    input_path = data_dir / 'headphones.csv'
    output_path = data_dir / 'headphones_with_image_urls.csv'

    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")
    print()

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        return 1

    # Process the CSV
    try:
        stats = process_csv(input_path, output_path)
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

    # Print results
    print("Processing complete!")
    print(f"  Name detection: brand='{stats['brand_col']}', model='{stats['model_col']}'")
    print(f"  Total rows:     {stats['total_rows']}")
    print(f"  URLs generated: {stats['urls_generated']}")

    if stats['errors']:
        print(f"  Errors:         {len(stats['errors'])}")
        for err in stats['errors'][:5]:
            print(f"    - {err}")

    print()
    print(f"Output saved to: {output_path}")

    return 0


if __name__ == '__main__':
    exit(main())
