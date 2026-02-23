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
        `INSERT INTO checks (user_id, name, number) VALUES (?, ?, ?)`
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