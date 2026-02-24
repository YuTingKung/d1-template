import { renderHtml } from "./renderHtml";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Helper: 包裝 CORS 回應
    function withCors(response: any) {
      response.headers.set("Access-Control-Allow-Origin", "*"); // 允許任何網頁抓
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
      return response;
    }

    // 處理 OPTIONS 預檢請求
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    // Excel 上傳 API
    if (url.pathname === "/api/upload_excel" && request.method === "POST") {
      try {
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
          return withCors(new Response("Content-Type must be multipart/form-data", { status: 400 }));
        }

        // 解析 multipart/form-data
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file || !(file instanceof File)) {
          return withCors(new Response("No file uploaded or file is invalid", { status: 400 }));
        }

        // 讀取 Excel buffer
        const arrayBuffer = await file.arrayBuffer();
        // 動態 import xlsx
        const { XLSX } = await import("./xlsx");
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        // 欄位對應
        const mapRow = (row: any) => ({
          name: row["請問您的大名："] || "",
          relation: row["與新人的關係："] || "",
          attend_status: row["是否會出席婚宴：無法出席不用感到壓力，只求哥哥姐姐紅包給力💛"] || "",
          with_guest: row["是否攜伴出席："] || "",
          need_child_seat: row["是否需要兒童座椅："] || "",
          need_vegetarian: row["是否需要素食：請一併考量同行親友唷！"] || "",
          need_invitation: row["是否需要寄送喜帖："] || "",
          email: row["電子喜帖寄送 email："] || "",
          address: row["紙本喜帖寄送地址：記得填寫郵遞區號唷！"] || "",
          phone: row["您的聯絡電話："] || "",
          message: row["有什麼話想和我們說："] || "",
          answer_time: row["填答時間"] || "",
          answer_seconds: row["填答秒數"] || 0,
          ip: row["IP紀錄"] || "",
          full_flag: row["額滿結束註記"] || "",
          user_record: row["使用者紀錄"] || "",
          member_time: row["會員時間"] || "",
          hash: row["Hash"] || ""
        });

        // 批次寫入 DB
        let successCount = 0;
        for (const r of rows) {
          const data = mapRow(r);
          const stmt = env.DB.prepare(
            `INSERT INTO wedding_guests (name, relation, attend_status, with_guest, need_child_seat, need_vegetarian, need_invitation, email, address, phone, message, answer_time, answer_seconds, ip, full_flag, user_record, member_time, hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            data.name, data.relation, data.attend_status, data.with_guest, data.need_child_seat, data.need_vegetarian, data.need_invitation, data.email, data.address, data.phone, data.message, data.answer_time, data.answer_seconds, data.ip, data.full_flag, data.user_record, data.member_time, data.hash
          );
          const result = await stmt.run();
          if (result.success) successCount++;
        }
        return withCors(new Response(`成功匯入 ${successCount} 筆`, { status: 200 }));
      } catch (e) {
        return withCors(new Response("Excel 解析或寫入失敗: " + e, { status: 500 }));
      }
    }
    if (url.pathname === "/api/wedding_guests") {
      const stmt = env.DB.prepare(`SELECT * FROM wedding_guests`);
      const { results } = await stmt.all();

      return withCors(
        new Response(JSON.stringify(results), {
          headers: { "content-type": "application/json" },
        })
      );
    }
    // API 路徑
    if (url.pathname === "/api/comments") {
      const limit = url.searchParams.get("limit");
      const stmt = env.DB.prepare(`SELECT * FROM comments LIMIT ${limit || 3}`);
      const { results } = await stmt.all();

      return withCors(
        new Response(JSON.stringify(results), {
          headers: { "content-type": "application/json" },
        })
      );
    }

    if (url.pathname === "/api/checks") {
      const stmt = env.DB.prepare(`SELECT * FROM checks`);
      const { results } = await stmt.all();

      return withCors(
        new Response(JSON.stringify(results), {
          headers: { "content-type": "application/json" },
        })
      );
    }

    if (url.pathname === "/api/check") {
      const user_id = url.searchParams.get("user_id");
      const name = url.searchParams.get("name");
      const number = url.searchParams.get("number");

      const { success } = await env.DB.prepare(
        `INSERT INTO checks (user_id, name, number, update_at) VALUES (?, ?, ?, datetime('now', '+8 hours'))`
      )
        .bind(user_id, name, number)
        .run();

      return withCors(
        new Response(success ? "Created" : "Something went wrong", {
          status: success ? 201 : 500,
        })
      );
    }

    // 預設頁面
    const stmt = env.DB.prepare("SELECT * FROM comments LIMIT 3");
    const { results } = await stmt.all();

    return withCors(
      new Response(renderHtml(JSON.stringify(results, null, 2)), {
        headers: { "content-type": "text/html" },
      })
    );
  },
} satisfies ExportedHandler<Env>;