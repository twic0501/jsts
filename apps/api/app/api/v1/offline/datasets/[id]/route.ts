import { NextResponse } from "next/server";
import { mockDatasets } from "../../../../../../lib/offline/mock-datasets";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const dataset = mockDatasets.find(
      (item) => item.id === id && item.status === "PUBLISHED",
    );

    if (!dataset) {
      return NextResponse.json(
        {
          success: false,
          message: "Dataset not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    console.error("[GET /api/v1/offline/datasets/[id]]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve dataset.",
      },
      { status: 500 },
    );
  }
}
