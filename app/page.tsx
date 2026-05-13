import CsvUploader from "@/components/csv-uploader";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          CSV データ整形ツール
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            契約データCSVをアップロードして、商品名・ステータスで絞り込み・必要なカラムのみ抽出します。
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              UTF-8・Shift_JIS など日本語エンコーディングに自動対応
            </span>
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
              抽出されるカラム
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              顧客ID、電話番号、商品名、契約日、課金日、解約日、ステータス、料金
            </p>
          </div>
          <CsvUploader />
        </div>
      </div>
    </main>
  );
}
