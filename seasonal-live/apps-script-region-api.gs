const SPREADSHEET_IDS = Object.freeze({
  owari: "1EdMoSu9UDSOON1PoSTqDIWuoRvTqdF81WbzYQNI_V-k",
  mikawa_with: "1vLoZYBmhDDCpoyx8G3wFWHy2KHTbqXIUOry7Zhxn9gI",
  mikawa_without: "1GOCsPFZbLyWGnSrJ6UNekIN3DQLp7Ry1P2e666AmHgs",
  shizuoka: "1dWVkhGMW9SP4Q8t0P4xW08DVnVr1Fuf1K2-R5GMbwaE"
});

function doGet(e) {
  const callback = String((e && e.parameter && e.parameter.callback) || "");
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "invalid callback" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const region = String((e && e.parameter && e.parameter.region) || "");
    const spreadsheetId = SPREADSHEET_IDS[region];
    if (!spreadsheetId) throw new Error("地域区分が不正です");

    const book = SpreadsheetApp.openById(spreadsheetId);
    const planSheet = book.getSheetByName("プランマスター");
    const noteSheet = book.getSheetByName("特記事項");
    const unitSheet = book.getSheetByName("料金単価");
    if (!planSheet || !noteSheet || !unitSheet) {
      throw new Error("必要なシートが見つかりません");
    }

    return respond_(callback, {
      ok: true,
      region: region,
      generatedAt: new Date().toISOString(),
      planRows: planSheet.getDataRange().getValues().slice(1),
      noteRows: noteSheet.getDataRange().getValues().slice(1),
      unitRows: unitSheet.getDataRange().getValues().slice(1)
    });
  } catch (error) {
    return respond_(callback, {
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function respond_(callback, data) {
  return ContentService.createTextOutput(
    callback + "(" + JSON.stringify(data) + ");"
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
