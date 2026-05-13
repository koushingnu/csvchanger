type CsvRow = Record<string, string>;

const TARGET_COLUMNS = ["name", "email", "phone"] as const;

export function processCSV(data: CsvRow[]): CsvRow[] {
  return data.map((row) => {
    const processedRow: CsvRow = {};

    TARGET_COLUMNS.forEach((column) => {
      if (column in row) {
        processedRow[column] = row[column];
      }
    });

    return processedRow;
  });
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
