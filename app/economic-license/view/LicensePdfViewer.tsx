"use client"

import { useEffect, useRef, useState } from "react"

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number }
  render: (options: {
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
  }) => { promise: Promise<void> }
}

type PdfDocument = {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPage>
  destroy: () => Promise<void>
}

type PdfJsApi = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (options: {
    url: string
    withCredentials?: boolean
    disableRange?: boolean
    disableStream?: boolean
  }) => { promise: Promise<PdfDocument>; destroy: () => Promise<void> }
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsApi
  }
}

const PDF_URL = "/api/economic-license/file?type=view"
const PDFJS_VERSION = "3.11.174"
const PDFJS_SCRIPT = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`

function loadPdfJs(): Promise<PdfJsApi> {
  if (typeof window !== "undefined" && window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib)
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-maidora-pdfjs="true"]'
    )

    const onReady = () => {
      if (window.pdfjsLib) resolve(window.pdfjsLib)
      else reject(new Error("تعذر تشغيل عارض PDF"))
    }

    if (existing) {
      existing.addEventListener("load", onReady, { once: true })
      existing.addEventListener("error", () => reject(new Error("تعذر تحميل عارض PDF")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = PDFJS_SCRIPT
    script.async = true
    script.dataset.maidoraPdfjs = "true"
    script.onload = onReady
    script.onerror = () => reject(new Error("تعذر تحميل عارض PDF. تحقق من اتصال الإنترنت ثم أعد المحاولة."))
    document.head.appendChild(script)
  })
}

export default function LicensePdfViewer() {
  const pagesRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PdfDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pageCount, setPageCount] = useState(0)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    let cancelled = false
    let loadingTask: ReturnType<PdfJsApi["getDocument"]> | null = null
    let loadedDocument: PdfDocument | null = null

    async function openPdf() {
      try {
        const api = await loadPdfJs()
        if (cancelled) return

        api.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
        loadingTask = api.getDocument({
          url: PDF_URL,
          withCredentials: true,
          disableRange: false,
          disableStream: false,
        })

        loadedDocument = await loadingTask.promise
        if (cancelled) {
          await loadedDocument.destroy()
          return
        }

        pdfRef.current = loadedDocument
        setPageCount(loadedDocument.numPages)
        setLoading(false)
      } catch (cause) {
        if (cancelled) return
        console.error("MAIDORA_PDF_VIEWER_ERROR", cause)
        setError(cause instanceof Error ? cause.message : "تعذر عرض ملف الترخيص")
        setLoading(false)
      }
    }

    openPdf()

    return () => {
      cancelled = true
      pdfRef.current = null
      if (loadedDocument) void loadedDocument.destroy()
      else if (loadingTask) void loadingTask.destroy()
    }
  }, [])

  useEffect(() => {
    const pdf = pdfRef.current
    const container = pagesRef.current
    if (!pdf || !container) return

    let cancelled = false
    container.replaceChildren()

    async function renderPages() {
      try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return

          const page = await pdf.getPage(pageNumber)
          const baseViewport = page.getViewport({ scale: 1 })
          const availableWidth = Math.max(container.clientWidth - 24, 260)
          const fitScale = Math.min(availableWidth / baseViewport.width, 2)
          const viewport = page.getViewport({ scale: fitScale * zoom })
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

          const wrapper = document.createElement("div")
          wrapper.className = "mx-auto mb-5 flex w-fit max-w-full justify-center overflow-hidden rounded-sm bg-white shadow-lg"

          const canvas = document.createElement("canvas")
          canvas.setAttribute("role", "img")
          canvas.setAttribute("aria-label", `صفحة ${pageNumber} من ${pdf.numPages}`)
          canvas.width = Math.ceil(viewport.width * pixelRatio)
          canvas.height = Math.ceil(viewport.height * pixelRatio)
          canvas.style.width = `${Math.ceil(viewport.width)}px`
          canvas.style.height = `${Math.ceil(viewport.height)}px`
          canvas.style.maxWidth = "none"

          const context = canvas.getContext("2d", { alpha: false })
          if (!context) throw new Error("تعذر تجهيز مساحة عرض PDF")

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
          wrapper.appendChild(canvas)
          container.appendChild(wrapper)

          await page.render({ canvasContext: context, viewport }).promise
        }
      } catch (cause) {
        if (!cancelled) {
          console.error("MAIDORA_PDF_RENDER_ERROR", cause)
          setError("تعذر رسم صفحات الترخيص. أعد تحميل الصفحة للمحاولة مرة أخرى.")
        }
      }
    }

    void renderPages()
    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [pageCount, zoom])

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-3 py-2 sm:px-5">
          <a
            href="/"
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            العودة للموقع
          </a>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-black sm:text-base">عرض الترخيص الاقتصادي</h1>
            <p className="text-[11px] text-slate-500">مستند PDF</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.65, Math.round((value - 0.15) * 100) / 100))}
              disabled={loading || zoom <= 0.65}
              aria-label="تصغير"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-xl font-bold disabled:opacity-40"
            >
              −
            </button>
            <span className="w-11 text-center text-xs font-bold tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(2.5, Math.round((value + 0.15) * 100) / 100))}
              disabled={loading || zoom >= 2.5}
              aria-label="تكبير"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-xl font-bold disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-2 py-4 sm:px-5 sm:py-6">
        {loading && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <p className="text-sm font-bold text-slate-600">جاري تجهيز الرخصة للعرض...</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-white p-5 text-center shadow-sm">
            <p className="font-bold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && pageCount > 0 && (
          <>
            <p className="mb-3 text-center text-xs font-semibold text-slate-500">
              {pageCount} {pageCount === 1 ? "صفحة" : "صفحات"} — استخدم إصبعيك أو أزرار التكبير لتوضيح التفاصيل
            </p>
            <div
              ref={pagesRef}
              className="overflow-x-auto rounded-xl bg-slate-200 p-2 sm:p-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            />
          </>
        )}
      </section>
    </main>
  )
}
