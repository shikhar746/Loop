import { ANALYST_UP, requireRole } from "@/lib/guards";
import { badRequest, json, withHandler } from "@/lib/http";
import { importFeedbackCsv } from "@/lib/services/feedback";
import { IMPORT_MAX_BYTES } from "@/lib/validators/feedback";

export const dynamic = "force-dynamic";

// multipart/form-data with a "file" field holding the CSV.
export const POST = withHandler(async (req) => {
  const ctx = await requireRole(...ANALYST_UP);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest('Send multipart/form-data with the CSV in a "file" field.');
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest('Missing "file" field with the CSV upload.');
  if (file.size === 0) throw badRequest("The uploaded file is empty.");
  if (file.size > IMPORT_MAX_BYTES) throw badRequest("CSV files can be at most 2 MB.");
  if (!/\.csv$/i.test(file.name) && !/csv|text\/plain|application\/vnd\.ms-excel/.test(file.type)) {
    throw badRequest("Upload a .csv file.");
  }

  return json(await importFeedbackCsv(ctx.workspaceId, await file.text()));
});
