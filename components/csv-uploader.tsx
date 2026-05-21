"use client";

import { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import {
  downloadCSV,
  convertToUTF8,
  extractProductNames,
  extractStatuses,
  extractAllColumns,
  processCSVWithProductFilter,
  getPreviousMonth,
  loadColumnFormats,
  saveColumnFormats,
  applyPresetFormats,
  getFormatForProduct,
  DEFAULT_FORMAT,
  PRESET_FORMATS,
  type ColumnFormat,
} from "@/utils/csv";

type StatusType = "idle" | "processing" | "ready" | "preview" | "success" | "error";

type CsvRow = Record<string, string>;

export default function CsvUploader() {
  const [status, setStatus] = useState<StatusType>("idle");
  const [message, setMessage] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [productNames, setProductNames] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [cancelYearMonth, setCancelYearMonth] = useState<string>("");
  const [columnFormats, setColumnFormats] = useState<Record<string, ColumnFormat>>({});
  const [showFormatSettings, setShowFormatSettings] = useState<boolean>(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_FORMAT.columns);

  // 初期化（クライアントサイドのみ）
  useEffect(() => {
    setCancelYearMonth(getPreviousMonth());
    setColumnFormats(loadColumnFormats());
  }, []);

  // 商品が選択されたときにフォーマットを読み込み（プリセット優先）
  useEffect(() => {
    if (selectedProduct) {
      const format = getFormatForProduct(selectedProduct, columnFormats);
      setSelectedColumns(format.columns);
    }
  }, [selectedProduct, columnFormats]);

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
      setCsvData([]);
      setProductNames([]);
      setSelectedProduct("");
      setStatuses([]);
      setSelectedStatus("all");
      setPreviewData([]);
      // クライアントサイドでのみ実行されるため安全
      if (typeof window !== "undefined") {
        setCancelYearMonth(getPreviousMonth());
      }
    },
    [],
  );

  // Step 1: CSVを読み込んで商品名一覧を取得
  const handleLoadCSV = useCallback(async () => {
    const fileInput = document.getElementById("csv-file") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setStatus("error");
      setMessage("ファイルを選択してください");
      return;
    }

    setStatus("processing");
    setMessage("CSVを読み込み中...");

    try {
      const utf8Text = await convertToUTF8(file);

      Papa.parse<CsvRow>(utf8Text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (results.data.length === 0) {
              setStatus("error");
              setMessage("CSVファイルが空です");
              return;
            }

            // 商品名一覧を取得
            const products = extractProductNames(results.data);

            if (products.length === 0) {
              setStatus("error");
              setMessage("商品名カラムが見つかりませんでした");
              return;
            }

            // ステータス一覧を取得
            const statusList = extractStatuses(results.data);

            // すべてのカラムを取得
            const allColumns = extractAllColumns(results.data);

            // プリセットフォーマットを自動適用
            const updatedFormats = applyPresetFormats(products, columnFormats);
            setColumnFormats(updatedFormats);
            saveColumnFormats(updatedFormats);

            setCsvData(results.data);
            setProductNames(products);
            setStatuses(statusList);
            setAvailableColumns(allColumns);
            setStatus("ready");
            setMessage(
              `${results.data.length}件のデータを読み込みました。商品名とステータスを選択してください。`,
            );
          } catch (error) {
            setStatus("error");
            setMessage(
              `エラーが発生しました: ${
                error instanceof Error ? error.message : "不明なエラー"
              }`,
            );
          }
        },
        error: (error: Error) => {
          setStatus("error");
          setMessage(`CSVの読み込みに失敗しました: ${error.message}`);
        },
      });
    } catch (error) {
      setStatus("error");
      setMessage(
        `ファイルの変換に失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
      );
    }
  }, []);

  // Step 2: プレビュー表示
  const handlePreview = useCallback(() => {
    if (!selectedProduct) {
      setStatus("error");
      setMessage("商品名を選択してください");
      return;
    }

    if (selectedColumns.length === 0) {
      setStatus("error");
      setMessage("少なくとも1つのカラムを選択してください");
      return;
    }

    try {
      // 現在選択されているカラムでフォーマットを作成
      const format: ColumnFormat = {
        name: selectedProduct,
        columns: selectedColumns,
      };

      const processedData = processCSVWithProductFilter(
        csvData,
        selectedProduct,
        selectedStatus,
        cancelYearMonth,
        format
      );

      if (processedData.length === 0) {
        const statusText =
          selectedStatus === "all" ? "" : `（${selectedStatus}）`;
        const cancelText =
          cancelYearMonth === "all" ? "" : `（${cancelYearMonth}解約）`;
        // 状態は "ready" のまま保持し、エラーメッセージのみ表示
        setMessage(
          `⚠️ 「${selectedProduct}」${statusText}${cancelText}のデータが見つかりませんでした。条件を変更して再度お試しください。`
        );
        return;
      }

      setPreviewData(processedData);
      setStatus("preview");
      setMessage(
        `${processedData.length}件のデータが抽出されました。プレビューを確認してダウンロードしてください。`
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        `エラーが発生しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
    }
  }, [csvData, selectedProduct, selectedStatus, cancelYearMonth, selectedColumns]);

  // フォーマットを保存
  const handleSaveFormat = useCallback(() => {
    if (!selectedProduct) {
      alert("商品名を選択してください");
      return;
    }

    if (selectedColumns.length === 0) {
      alert("少なくとも1つのカラムを選択してください");
      return;
    }

    const newFormat: ColumnFormat = {
      name: selectedProduct,
      columns: selectedColumns,
    };

    const updatedFormats = {
      ...columnFormats,
      [selectedProduct]: newFormat,
    };

    setColumnFormats(updatedFormats);
    saveColumnFormats(updatedFormats);
    alert(`「${selectedProduct}」のフォーマットを保存しました`);
  }, [selectedProduct, selectedColumns, columnFormats]);

  // フォーマットをリセット
  const handleResetFormat = useCallback(() => {
    if (!selectedProduct) return;

    const updatedFormats = { ...columnFormats };
    delete updatedFormats[selectedProduct];

    setColumnFormats(updatedFormats);
    saveColumnFormats(updatedFormats);
    setSelectedColumns(DEFAULT_FORMAT.columns);
    alert(`「${selectedProduct}」のフォーマットをデフォルトに戻しました`);
  }, [selectedProduct, columnFormats]);

  // カラムの選択/選択解除を切り替え
  const toggleColumn = useCallback(
    (column: string) => {
      if (selectedColumns.includes(column)) {
        setSelectedColumns(selectedColumns.filter((c) => c !== column));
      } else {
        setSelectedColumns([...selectedColumns, column]);
      }
    },
    [selectedColumns]
  );

  // Step 3: ダウンロード
  const handleDownload = useCallback(() => {
    if (previewData.length === 0) {
      setStatus("error");
      setMessage("プレビューデータがありません");
      return;
    }

    try {
      setStatus("processing");
      setMessage("ダウンロード中...");

      const csv = Papa.unparse(previewData);
      const statusSuffix = selectedStatus === "all" ? "" : `_${selectedStatus}`;
      const cancelSuffix = cancelYearMonth === "all" ? "" : `_${cancelYearMonth}`;
      const filename = `${selectedProduct}${statusSuffix}${cancelSuffix}_${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(csv, filename);

      setStatus("success");
      setMessage(`処理完了！${previewData.length}件のデータを出力しました。`);
    } catch (error) {
      setStatus("error");
      setMessage(
        `エラーが発生しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
      );
    }
  }, [previewData, selectedProduct, selectedStatus, cancelYearMonth]);

  return (
    <div className="space-y-6">
      {/* Step 1: ファイル選択 */}
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

      {/* Step 2: CSV読み込みボタン */}
      {status !== "ready" && status !== "success" && (
        <button
          onClick={handleLoadCSV}
          disabled={status === "processing" || !fileName}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          {status === "processing" ? "読み込み中..." : "CSVを読み込む"}
        </button>
      )}

      {/* Step 3: 商品名選択 */}
      {status === "ready" && productNames.length > 0 && (
        <>
          <div>
            <label
              htmlFor="product-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              商品名を選択
            </label>
            <select
              id="product-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="block w-full px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- 商品名を選択してください --</option>
              {productNames.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {productNames.length}種類の商品が見つかりました
            </p>
          </div>

          {/* ステータス選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              ステータスを選択
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={selectedStatus === "all"}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                  すべて
                </span>
              </label>
              {statuses.map((statusOption) => (
                <label key={statusOption} className="flex items-center">
                  <input
                    type="radio"
                    value={statusOption}
                    checked={selectedStatus === statusOption}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                    {statusOption}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 退会年月選択 */}
          <div>
            <label
              htmlFor="cancel-year-month"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              退会年月を選択
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={cancelYearMonth === "all"}
                  onChange={(e) => setCancelYearMonth(e.target.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                  すべて
                </span>
              </label>
              <div className="flex items-center">
                <input
                  type="radio"
                  value="specific"
                  checked={cancelYearMonth !== "all" && cancelYearMonth !== ""}
                  onChange={() => setCancelYearMonth(getPreviousMonth())}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <input
                  type="month"
                  value={cancelYearMonth === "all" || cancelYearMonth === "" ? getPreviousMonth() : cancelYearMonth}
                  onChange={(e) => setCancelYearMonth(e.target.value)}
                  disabled={cancelYearMonth === "all"}
                  className="ml-2 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                />
              </div>
            </div>
            {cancelYearMonth && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                デフォルト：前月（{getPreviousMonth()}）
              </p>
            )}
          </div>

          {/* フォーマット設定ボタン */}
          <div>
            <button
              onClick={() => setShowFormatSettings(!showFormatSettings)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showFormatSettings ? "▼ " : "▶ "}
              抽出カラムのフォーマット設定
            </button>
          </div>

          {/* フォーマット設定UI */}
          {showFormatSettings && (() => {
            const isPresetProduct = !!(selectedProduct && PRESET_FORMATS[selectedProduct]);
            const hasCustomFormat = !!(selectedProduct && columnFormats[selectedProduct]);
            
            return (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      「{selectedProduct || "商品"}」のカラム設定
                    </p>
                    {isPresetProduct && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ プリセット設定あり（変更不可）
                      </p>
                    )}
                    {!isPresetProduct && hasCustomFormat && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        カスタム設定
                      </p>
                    )}
                  </div>
                  {!isPresetProduct && (
                    <div className="space-x-2">
                      <button
                        onClick={handleSaveFormat}
                        disabled={!selectedProduct}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded disabled:cursor-not-allowed"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleResetFormat}
                        disabled={!selectedProduct}
                        className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded disabled:cursor-not-allowed"
                      >
                        リセット
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400">
                  選択中: {selectedColumns.length}個のカラム
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-900">
                  {availableColumns.map((column) => {
                    const isSelected = selectedColumns.includes(column);
                    const isDisabled = isPresetProduct;
                    
                    return (
                      <label
                        key={column}
                        className={`flex items-center space-x-2 p-1 rounded ${
                          isDisabled
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !isDisabled && toggleColumn(column)}
                          disabled={isDisabled}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-gray-900 dark:text-gray-100">
                          {column}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  {isPresetProduct ? (
                    <p>
                      🔒 この商品はプリセット設定のため、カラムの変更はできません
                    </p>
                  ) : (
                    <>
                      <p>💡 選択したカラムのみがCSVに出力されます</p>
                      <p>
                        💡 設定は商品ごとに保存され、次回から自動的に適用されます
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Step 4: プレビューボタン */}
      {status === "ready" && (
        <button
          onClick={handlePreview}
          disabled={!selectedProduct}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          データをプレビュー
        </button>
      )}

      {/* Step 5: プレビュー表示 */}
      {status === "preview" && previewData.length > 0 && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              プレビュー（全{previewData.length}件中、最初の100件を表示）
            </p>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  {previewData[0] &&
                    Object.keys(previewData[0]).map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 dark:border-gray-700"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.slice(0, 100).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {Object.values(row).map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100 whitespace-nowrap border-r border-gray-100 dark:border-gray-800"
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 6: ダウンロードボタン */}
      {status === "preview" && (
        <button
          onClick={handleDownload}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
        >
          このデータをダウンロード
        </button>
      )}

      {/* メッセージ表示 */}
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

      {/* 成功後にリセットボタン */}
      {status === "success" && (
        <button
          onClick={() => {
            setStatus("ready");
            setSelectedProduct("");
            setSelectedStatus("all");
            setPreviewData([]);
            setMessage("");
          }}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          別の条件で抽出
        </button>
      )}

      {/* プレビュー中に戻るボタン */}
      {status === "preview" && (
        <button
          onClick={() => {
            setStatus("ready");
            setPreviewData([]);
            setMessage("");
          }}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          条件を変更
        </button>
      )}
    </div>
  );
}
