import csv
import os
import re
import sys

from pypdf import PdfReader


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower().replace("univesity", "university"))


def clean_course_name(raw: str) -> str:
    tokens = re.sub(r"\s+", " ", raw).strip().split(" ")
    merged: list[str] = []

    for token in tokens:
        if len(token) == 1 and token.isalpha() and merged:
            merged[-1] += token
        else:
            merged.append(token)

    return " ".join(word.capitalize() for word in " ".join(merged).split())


def extract_location(raw_line: str) -> str:
    parts = [part.strip() for part in raw_line.split(",") if part.strip()]

    for part in reversed(parts):
        candidate = re.sub(r"pin code.*$", "", part, flags=re.I)
        candidate = re.sub(r"\bKARNATAKA\b", "", candidate, flags=re.I)
        candidate = re.sub(r"\b\d{5,6}\b", "", candidate)
        candidate = candidate.strip(" .,-")
        if candidate and re.search(r"[A-Za-z]{3,}", candidate):
            return candidate

    return "Karnataka"


def extract_college_name(raw_line: str) -> str:
    line = re.sub(r"^E\d+\s+", "", raw_line).strip()
    name = line.split(",", 1)[0].strip()

    if re.search(r"\d", name):
        name = re.split(r"\s(?=\d)", line, maxsplit=1)[0].strip()

    name = re.sub(r"\(.*?autonomous.*?\)", "", name, flags=re.I)
    name = re.sub(r"\(a state autonomous public university on iit model\)", "", name, flags=re.I)
    name = re.sub(r"\s+", " ", name).strip()

    marker = re.search(r"\s(NEAR|POST|ROAD|LAYOUT|CIRCLE|NAGAR|CAMPUS|VIA|DISTRICT|TALUK)\b", name, flags=re.I)
    if marker and marker.start() > 24:
        name = name[:marker.start()].strip()

    return name


def read_pdf_text(path: str) -> str:
    reader = PdfReader(path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def build_official_dataset(data_dir: str) -> list[dict]:
    cutoff_text = read_pdf_text(os.path.join(data_dir, "kea-ugcet-2025-engineering-cutoff.pdf"))
    seat_matrix_text = read_pdf_text(os.path.join(data_dir, "kea-ugcet-2025-engineering-round2-seat-matrix.pdf"))

    course_map: dict[str, list[str]] = {}
    for block in re.split(r"\nCollege:\s*", seat_matrix_text)[1:]:
        code_match = re.search(r"\n(E\d{3})\s", block)
        if not code_match:
            continue

        code = code_match.group(1)
        courses = []
        for match in re.finditer(r"\n([A-Z][A-Z\s&./()-]+?)\nE\d{3}\s", block):
            course = clean_course_name(match.group(1))
            if course and course not in courses:
                courses.append(course)

        course_map[code] = courses or ["Engineering"]

    colleges = []
    for match in re.finditer(r"College:\s*(E\d{3})\s+(.+)", cutoff_text):
        code = match.group(1)
        raw_line = re.sub(r"\s+", " ", match.group(2)).strip()
        colleges.append(
            {
                "code": code,
                "name": extract_college_name(raw_line),
                "location": extract_location(raw_line),
                "courses": course_map.get(code, ["Engineering"]),
            }
        )

    return colleges


def write_csv(data_dir: str, colleges: list[dict]) -> None:
    output_path = os.path.join(data_dir, "kea-kcet-engineering-colleges.csv")
    with open(output_path, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["code", "name", "location", "type", "rank", "rating", "feesPerYear", "description", "courses"])
        for index, college in enumerate(colleges, start=1):
            writer.writerow(
                [
                    college["code"],
                    college["name"],
                    college["location"],
                    "Engineering",
                    index,
                    4.2,
                    150000,
                    f'{college["name"]} is listed in the official KEA UGCET 2025 engineering seat matrix.',
                    "|".join(college["courses"]),
                ]
            )


def main() -> None:
    data_dir = os.path.join(os.getcwd(), "data")
    colleges = build_official_dataset(data_dir)
    write_csv(data_dir, colleges)
    print(f"OFFICIAL_COLLEGES={len(colleges)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(error)
        sys.exit(1)
