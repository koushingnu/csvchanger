import Encoding from "encoding-japanese";

type CsvRow = Record<string, string>;

// カラムフォーマットの型定義
export type ColumnFormat = {
  name: string;
  columns: string[];
};

// デフォルトのカラムフォーマット
export const DEFAULT_FORMAT: ColumnFormat = {
  name: "デフォルト",
  columns: [
    "顧客ID",
    "電話番号",
    "商品名",
    "契約日",
    "課金日",
    "解約日",
    "ステータス",
    "料金",
  ],
};

// 商品名ごとのプリセットフォーマット
// ここに事前に定義しておくと、その商品を選択したときに自動適用されます
export const PRESET_FORMATS: Record<string, string[]> = {
  "FiNCplus": [
    "顧客ID",
    "電話番号",
    "商品名",
    "契約日",
    "解約日",
    "ステータス",
  ],
  "ライフサポート24": [
    "顧客ID",
    "電話番号",
    "商品名",
    "契約日",
    "課金日",
    "料金",
  ],
  "スマホ安心サポート": [
    "顧客ID",
    "電話番号",
    "商品名",
    "契約日",
    "ステータス",
  ],
  "ゆれしる": [
    "顧客ID",
    "電話番号",
    "商品名",
    "契約日",
  ],
  "ライフサポートパック": [
    "顧客ID",
    "電話番号",
    "商品名",
    "契約日",
    "課金日",
    "解約日",
    "料金",
  ],
  "LEAN BODY（リーンボディ）": [
    "顧客ID",
    "電話番号",
    "商品名",
    "契約日",
    "解約日",
    "ステータス",
    "解約キー"
  ],
  // 新しい商品を追加する場合はここに定義を追加してください
  // "商品名": ["カラム1", "カラム2", ...],
};

// LocalStorageのキー
const FORMATS_STORAGE_KEY = "csv_column_formats";

// フォーマット設定を保存
export function saveColumnFormats(formats: Record<string, ColumnFormat>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(FORMATS_STORAGE_KEY, JSON.stringify(formats));
  }
}

// フォーマット設定を読み込み
export function loadColumnFormats(): Record<string, ColumnFormat> {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(FORMATS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
  }
  return {};
}

// プリセットフォーマットを適用
export function applyPresetFormats(
  productNames: string[],
  existingFormats: Record<string, ColumnFormat>
): Record<string, ColumnFormat> {
  const updatedFormats = { ...existingFormats };

  productNames.forEach((productName) => {
    // 既にカスタム設定がある場合はスキップ
    if (existingFormats[productName]) {
      return;
    }

    // プリセットが存在する場合は適用
    if (PRESET_FORMATS[productName]) {
      updatedFormats[productName] = {
        name: productName,
        columns: PRESET_FORMATS[productName],
      };
    }
  });

  return updatedFormats;
}

// 商品のフォーマットを取得（プリセット → カスタム → デフォルトの優先順位）
export function getFormatForProduct(
  productName: string,
  customFormats: Record<string, ColumnFormat>
): ColumnFormat {
  // カスタム設定が優先
  if (customFormats[productName]) {
    return customFormats[productName];
  }

  // プリセットが次
  if (PRESET_FORMATS[productName]) {
    return {
      name: productName,
      columns: PRESET_FORMATS[productName],
    };
  }

  // 最後にデフォルト
  return DEFAULT_FORMAT;
}

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

// ステータスの一覧を取得
export function extractStatuses(data: CsvRow[]): string[] {
  const statuses = new Set<string>();
  
  data.forEach((row) => {
    if (row["ステータス"] && row["ステータス"].trim() !== "") {
      statuses.add(row["ステータス"].trim());
    }
  });
  
  return Array.from(statuses).sort();
}

// すべてのカラム名を取得
export function extractAllColumns(data: CsvRow[]): string[] {
  if (data.length === 0) return [];
  
  const columns = Object.keys(data[0]);
  return columns;
}

// 商品名とステータスと退会年月でフィルタリングしてカラムを抽出
export function processCSVWithProductFilter(
  data: CsvRow[],
  selectedProduct: string,
  selectedStatus?: string,
  cancelYearMonth?: string,
  columnFormat?: ColumnFormat
): CsvRow[] {
  // 商品名でフィルタリング
  let filteredData = data.filter(
    (row) => row["商品名"] === selectedProduct
  );

  // ステータスでフィルタリング（指定がある場合）
  if (selectedStatus && selectedStatus !== "all") {
    filteredData = filteredData.filter(
      (row) => row["ステータス"] === selectedStatus
    );
  }

  // 退会年月でフィルタリング（指定がある場合）
  if (cancelYearMonth && cancelYearMonth !== "all") {
    filteredData = filteredData.filter((row) => {
      const cancelDate = row["解約日"];
      if (!cancelDate) return false;
      
      // YYYY-MM-DD形式からYYYY-MMを抽出
      const yearMonth = cancelDate.substring(0, 7);
      return yearMonth === cancelYearMonth;
    });
  }

  // 使用するカラム設定を決定
  const columns = columnFormat?.columns || DEFAULT_FORMAT.columns;

  // 必要なカラムのみ抽出
  return filteredData.map((row) => {
    const processedRow: CsvRow = {};

    columns.forEach((column) => {
      if (column in row) {
        processedRow[column] = row[column];
      }
    });

    return processedRow;
  });
}

// 前月のYYYY-MM形式を取得
export function getPreviousMonth(): string {
  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const year = previousMonth.getFullYear();
  const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
