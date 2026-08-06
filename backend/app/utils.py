"""
Common Utility Functions
"""

from datetime import datetime
from pathlib import Path
import uuid


# --------------------------------------------------
# Generate Unique Filename
# --------------------------------------------------

def generate_unique_filename(filename: str) -> str:
    """
    Prevent duplicate filenames.

    Example:
    AI.pdf

    becomes

    8c6c1d4b_AI.pdf
    """

    unique_id = uuid.uuid4().hex[:8]

    return f"{unique_id}_{filename}"


# --------------------------------------------------
# Get File Extension
# --------------------------------------------------

def get_file_extension(filename: str) -> str:
    """
    Returns file extension.
    """

    return Path(filename).suffix.lower()


# --------------------------------------------------
# Validate PDF
# --------------------------------------------------

def is_pdf(filename: str) -> bool:
    """
    Check if uploaded file is PDF.
    """

    return get_file_extension(filename) == ".pdf"


# --------------------------------------------------
# Format File Size
# --------------------------------------------------

def format_file_size(size: int) -> str:
    """
    Convert bytes into readable format.
    """

    kb = 1024
    mb = kb * 1024
    gb = mb * 1024

    if size >= gb:
        return f"{size / gb:.2f} GB"

    if size >= mb:
        return f"{size / mb:.2f} MB"

    if size >= kb:
        return f"{size / kb:.2f} KB"

    return f"{size} B"


# --------------------------------------------------
# Current Timestamp
# --------------------------------------------------

def current_timestamp() -> str:
    """
    Returns formatted current timestamp.
    """

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# --------------------------------------------------
# Allowed File Types
# --------------------------------------------------

ALLOWED_FILE_TYPES = {
    ".pdf"
}


def allowed_file(filename: str) -> bool:
    """
    Validate uploaded file extension.
    """

    return get_file_extension(filename) in ALLOWED_FILE_TYPES