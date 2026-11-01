import { NextResponse } from "next/server"
import { ObjectId, GridFSBucket } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { getEconomicLicenseSettings } from "@/lib/economic-license"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ByteRange =
  | { kind: "valid"; start: number; end: number }
  | { kind: "invalid" }
  | { kind: "ignore" }

/**
 * Parse one HTTP byte range. GridFS uses an exclusive end offset,
 * while the HTTP Range header uses an inclusive end offset.
 */
function parseByteRange(header: string | null, length: number): ByteRange {
  if (!header || !/^bytes=/i.test(header) || header.includes(",")) {
    return { kind: "ignore" }
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim())
  if (!match || (!match[1] && !match[2])) {
    return { kind: "ignore" }
  }

  if (length <= 0) return { kind: "invalid" }

  let start: number
  let end: number

  if (!match[1]) {
    // Suffix range: bytes=-500 means the last 500 bytes.
    const suffixLength = Number(match[2])
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { kind: "invalid" }
    }

    start = Math.max(length - suffixLength, 0)
    end = length - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Number(match[2]) : length - 1

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      end < start ||
      start >= length
    ) {
      return { kind: "invalid" }
    }

    // HTTP allows the requested end to exceed the actual file length.
    end = Math.min(end, length - 1)
  }

  return { kind: "valid", start, end }
}

function makeContentDisposition(fileName: string, type: "view" | "download") {
  const basename = fileName.split(/[\\/]/).pop() || "economic-development-license.pdf"
  const safeAsciiName = basename
    .replace(/[\r\n"]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/\\/g, "_")
  const encodedName = encodeURIComponent(basename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )
  const disposition = type === "view" ? "inline" : "attachment"

  return `${disposition}; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`
}

async function handleFileRequest(request: Request, headOnly = false) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    if (type !== "view" && type !== "download") {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    const settings = await getEconomicLicenseSettings()

    if (!settings.enabled) {
      return NextResponse.json({ error: "License is disabled" }, { status: 404 })
    }

    const fileId = type === "view" ? settings.viewFileId : settings.downloadFileId
    const fileName =
      (type === "view" ? settings.viewFileName : settings.downloadFileName) ||
      "economic-development-license.pdf"

    if (!fileId) {
      return NextResponse.json({ error: "File not available" }, { status: 404 })
    }

    if (type === "view" && !settings.viewEnabled) {
      return NextResponse.json({ error: "View is disabled" }, { status: 404 })
    }

    if (type === "download" && !settings.downloadEnabled) {
      return NextResponse.json({ error: "Download is disabled" }, { status: 404 })
    }

    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json({ error: "Stored file not found" }, { status: 404 })
    }

    const client = await clientPromise
    const db = client.db("maidora")
    const bucket = new GridFSBucket(db, { bucketName: "economic_license_files" })
    const objectId = new ObjectId(fileId)

    const storedFile = await db
      .collection("economic_license_files.files")
      .find({ _id: objectId })
      .limit(1)
      .next()

    if (!storedFile) {
      return NextResponse.json({ error: "Stored file not found" }, { status: 404 })
    }

    const fileLength = Number(storedFile.length)
    if (!Number.isSafeInteger(fileLength) || fileLength < 0) {
      throw new Error("Invalid stored PDF length")
    }

    const requestedRange = request.headers.get("range")
    // Without a validator for If-Range, send the complete file instead.
    const range = request.headers.has("if-range")
      ? ({ kind: "ignore" } as const)
      : parseByteRange(requestedRange, fileLength)

    const baseHeaders = new Headers({
      "Accept-Ranges": "bytes",
      "Content-Type": "application/pdf",
      "Content-Disposition": makeContentDisposition(fileName, type),
      "Cache-Control": "private, no-cache, no-store, must-revalidate, no-transform",
      "X-Content-Type-Options": "nosniff",
    })

    if (range.kind === "invalid") {
      baseHeaders.set("Content-Range", `bytes */${fileLength}`)
      baseHeaders.set("Content-Length", "0")
      return new Response(null, { status: 416, headers: baseHeaders })
    }

    const isPartial = range.kind === "valid"
    const start = isPartial ? range.start : 0
    const endExclusive = isPartial ? range.end + 1 : fileLength
    const responseLength = endExclusive - start

    baseHeaders.set("Content-Length", String(responseLength))

    if (isPartial) {
      baseHeaders.set(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${fileLength}`
      )
    }

    const status = isPartial ? 206 : 200

    if (headOnly) {
      return new Response(null, { status, headers: baseHeaders })
    }

    const stream =
      isPartial
        ? bucket.openDownloadStream(objectId, { start, end: endExclusive })
        : bucket.openDownloadStream(objectId, { start: 0 })

    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })
        stream.on("end", () => controller.close())
        stream.on("error", (error: Error) => controller.error(error))
      },
      cancel() {
        stream.destroy()
      },
    })

    return new Response(webStream, { status, headers: baseHeaders })
  } catch (error) {
    console.error("ECONOMIC_LICENSE_FILE_ERROR", error)

    return NextResponse.json(
      { error: "Failed to load file" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handleFileRequest(request)
}

export async function HEAD(request: Request) {
  return handleFileRequest(request, true)
}
