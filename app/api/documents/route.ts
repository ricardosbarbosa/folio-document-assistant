import { listDocuments } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ documents: await listDocuments() });
  } catch {
    return Response.json({ error: "Documents could not be loaded" }, { status: 500 });
  }
}
