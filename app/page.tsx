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
            CSVファイルをアップロードして、name・email・phoneカラムのみを抽出します。
          </p>
          <CsvUploader />
        </div>
      </div>
    </main>
  );
}
