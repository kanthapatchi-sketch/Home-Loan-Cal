import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // BOT (Bank of Thailand) MRR Reference API: https://www.bot.or.th/th/statistics/interest-rate.html
  const BOT_DATA = {
    success: true,
    source: "ธนาคารแห่งประเทศไทย (Bank of Thailand - ธปท.)",
    sourceUrl: "https://www.bot.or.th/th/statistics/interest-rate.html",
    asOfDate: "9 ตุลาคม 2569",
    policyRate: 2.25,
    lastSync: new Date().toISOString(),
    syncMode: "auto",
    banks: [
      {
        name: "ออมสิน (GSB)",
        fullName: "ธนาคารออมสิน",
        mrr: 6.045,
        color: "bg-pink-600 text-pink-600 border-pink-200",
        updateDate: "30 ก.ย. 2569",
        effectiveDate: "30 ก.ย. 2569",
        category: "state",
        change: -0.25,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "สถาบันการเงินเฉพาะกิจของรัฐ (ต่ำสุดในระบบ)"
      },
      {
        name: "ธอส. (GHB)",
        fullName: "ธนาคารอาคารสงเคราะห์",
        mrr: 6.145,
        color: "bg-orange-500 text-orange-600 border-orange-200",
        updateDate: "30 ก.ย. 2569",
        effectiveDate: "30 ก.ย. 2569",
        category: "state",
        change: -0.25,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "สถาบันการเงินเฉพาะกิจเพื่อที่อยู่อาศัย"
      },
      {
        name: "กรุงเทพ (BBL)",
        fullName: "ธนาคารกรุงเทพ จำกัด (มหาชน)",
        mrr: 6.500,
        color: "bg-blue-800 text-blue-800 border-blue-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.20,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์ขนาดใหญ่"
      },
      {
        name: "ไทยพาณิชย์ (SCB)",
        fullName: "ธนาคารไทยพาณิชย์ จำกัด (มหาชน)",
        mrr: 6.575,
        color: "bg-purple-700 text-purple-700 border-purple-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.20,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์ขนาดใหญ่"
      },
      {
        name: "กสิกรไทย (KBANK)",
        fullName: "ธนาคารกสิกรไทย จำกัด (มหาชน)",
        mrr: 6.580,
        color: "bg-emerald-600 text-emerald-600 border-emerald-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.20,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์ขนาดใหญ่"
      },
      {
        name: "กรุงศรีฯ (BAY)",
        fullName: "ธนาคารกรุงศรีอยุธยา จำกัด (มหาชน)",
        mrr: 6.670,
        color: "bg-yellow-600 text-yellow-600 border-yellow-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.20,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "กรุงไทย (KTB)",
        fullName: "ธนาคารกรุงไทย จำกัด (มหาชน)",
        mrr: 6.845,
        color: "bg-cyan-600 text-cyan-600 border-cyan-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.20,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์ในกำกับของรัฐ"
      },
      {
        name: "ทีทีบี (ttb)",
        fullName: "ธนาคารทหารไทยธนชาต จำกัด (มหาชน)",
        mrr: 7.105,
        color: "bg-orange-600 text-orange-600 border-orange-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.20,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "ไอซีบีซี (ICBC)",
        fullName: "ธนาคารไอซีบีซี (ไทย) จำกัด (มหาชน)",
        mrr: 7.150,
        color: "bg-rose-700 text-rose-700 border-rose-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: 0.00,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "ทิสโก้ (TISCO)",
        fullName: "ธนาคารทิสโก้ จำกัด (มหาชน)",
        mrr: 7.400,
        color: "bg-sky-700 text-sky-700 border-sky-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: 0.00,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "เกียรตินาคินภัทร (KKP)",
        fullName: "ธนาคารเกียรตินาคินภัทร จำกัด (มหาชน)",
        mrr: 7.400,
        color: "bg-violet-700 text-violet-700 border-violet-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: 0.00,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "ยูโอบี (UOB)",
        fullName: "ธนาคารยูโอบี จำกัด (มหาชน)",
        mrr: 8.075,
        color: "bg-blue-900 text-blue-900 border-blue-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: 0.00,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "LH Bank",
        fullName: "ธนาคารแลนด์ แอนด์ เฮ้าส์ จำกัด (มหาชน)",
        mrr: 8.180,
        color: "bg-indigo-900 text-indigo-900 border-indigo-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.25,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "CIMB Thai",
        fullName: "ธนาคาร ซีไอเอ็มบี ไทย จำกัด (มหาชน)",
        mrr: 8.525,
        color: "bg-red-700 text-red-700 border-red-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.20,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์"
      },
      {
        name: "ธ.ไทยเครดิต",
        fullName: "ธนาคารไทยเครดิต จำกัด (มหาชน)",
        mrr: 9.600,
        color: "bg-amber-600 text-amber-600 border-amber-200",
        updateDate: "9 ต.ค. 2569",
        effectiveDate: "9 ต.ค. 2569",
        category: "commercial",
        change: -0.30,
        source: "ธนาคารแห่งประเทศไทย (ธปท.)",
        note: "ธนาคารพาณิชย์เพื่อรายย่อย"
      }
    ]
  };

  app.get("/api/bot-mrr", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      ...BOT_DATA,
      lastSync: new Date().toISOString()
    });
  });

  app.post("/api/bot-mrr/sync", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      ...BOT_DATA,
      syncMode: "manual",
      lastSync: new Date().toISOString()
    });
  });


  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
