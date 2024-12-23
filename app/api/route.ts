import pdfParse from "pdf-parse";
import { zfd } from "zod-form-data";

const schema = zfd.formData({
  file: zfd.file(),
});

export async function POST(request: Request) {
  try {
    // Parse and validate the form data
    const formData = await request.formData();
    const result = schema.safeParse(formData);

    if (!result.success) {
      return new Response("Invalid request: Missing or invalid file", {
        status: 400,
      });
    }

    // Get the file from validated form data
    const file = result.data.file;

    // Convert file to buffer and parse PDF
    const dataBuffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(dataBuffer);

    console.log(pdfData);

    return new Response(pdfData.text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("PDF parsing error:", error);

    return new Response("Error parsing PDF file", {
      status: 500,
    });
  }
}
