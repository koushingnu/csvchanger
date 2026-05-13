import Encoding from "encoding-japanese";

type CsvRow = Record<string, string>;

// 抽出するカラム（contract形式用）
const CONTRACT_COLUMNS = [
  "顧客ID",
  "電話番号",
  "商品名",
  "契約日",
  "課金日",
  "解約日",
  "ステータス",
  "料金",
] as const;

export async function convertToUTF8(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // エンコーディングを検出
  const detectedEncoding = Encoding.detect(uint8Array);
  
  // UTF-8に変換
  const unicodeArray = Encoding.convert(uint8Array, {
    to: "UNICODE",
    from: detectedEncoding || "AUTO",
  });
  
  // 文字列に変換
  return Encoding.codeToString(unicodeArray);
}

// 商品名の一覧を取得
export function extractProductNames(data: CsvRow[]): string[] {
  const productNames = new Set<string>();
  
  data.forEach((row) => {
    if (row["商品名"] && row["商品名"].trim() !== "") {
      productNames.add(row["商品名"].trim());
    }
  });
  
  return Array.from(productNames).sort();
}

// 商品名でフィルタリングしてカラムを抽出
export function processCSVWithProductFilter(
  data: CsvRow[],
  selectedProduct: string
): CsvRow[] {
  // 商品名でフィルタリング
  const filteredData = data.filter(
    (row) => row["商品名"] === selectedProduct
  );

  // 必要なカラムのみ抽出
  return filteredData.map((row) => {
    const processedRow: CsvRow = {};

    CONTRACT_COLUMNS.forEach((column) => {
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
