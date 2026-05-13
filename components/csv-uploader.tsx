"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";
import { processCSV, downloadCSV } from "@/utils/csv";

type StatusType = "idle" | "processing" | "success" | "error";

export default function CsvUploader() {
  const [status, setStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.name.endsWith(".csv")) {
        setStatus("error");
        setMessage("CSVファイルのみアップロード可能です");
        return;
      }

      setFileName(file.name);
      setStatus("idle");
      setMessage("");
    },
    []
  );

  const handleProcess = useCallback(() => {
    const fileInput = document.getElementById(
      "csv-file"
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setStatus("error");
      setMessage("ファイルを選択してください");
      return;
    }

    setStatus("processing");
    setMessage("処理中...");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const processedData = processCSV(results.data);

          if (processedData.length === 0) {
            setStatus("error");
            setMessage(
              "有効なデータが見つかりませんでした。name, email, phone のいずれかのカラムが必要です。"
            );
            return;
          }

          const csv = Papa.unparse(processedData);
          downloadCSV(csv, "processed.csv");

          setStatus("success");
          setMessage(
            `処理完了！${processedData.length}件のデータを出力しました。`
          );
        } catch (error) {
          setStatus("error");
          setMessage(
            `エラーが発生しました: ${
              error instanceof Error ? error.message : "不明なエラー"
            }`
          );
        }
      },
      error: (error) => {
        setStatus("error");
        setMessage(`CSVの読み込みに失敗しました: ${error.message}`);
      },
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="csv-file"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          CSVファイルを選択
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-600 dark:file:text-gray-200"
        />
        {fileName && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            選択済み: {fileName}
          </p>
        )}
      </div>

      <button
        onClick={handleProcess}
        disabled={status === "processing" || !fileName}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
      >
        {status === "processing" ? "処理中..." : "実行"}
      </button>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            status === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
              : status === "error"
                ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
          }`}
        >
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}
    </div>
  );
}
