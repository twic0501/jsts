import { NextResponse } from "next/server";

import { mockDatasets } from "../../../../../lib/offline/mock-datasets";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const pageParam = Number(searchParams.get("page") ?? 1);
    const limitParam = Number(searchParams.get("limit") ?? 10);

    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 10;

    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim().toLowerCase();

    // Chỉ lấy Dataset đã được phát hành.
    let datasets = mockDatasets.filter(
      (dataset) => dataset.status === "PUBLISHED",
    );

    // Lọc theo category.
    if (category) {
      datasets = datasets.filter(
        (dataset) => dataset.category.toLowerCase() === category.toLowerCase(),
      );
    }

    // Tìm kiếm theo tên, mô tả, ID hoặc category.
    if (search) {
      datasets = datasets.filter((dataset) => {
        const searchableContent = [
          dataset.id,
          dataset.name,
          dataset.description,
          dataset.category,
        ]
          .join(" ")
          .toLowerCase();

        return searchableContent.includes(search);
      });
    }

    const totalItems = datasets.length;
    const totalPages = Math.ceil(totalItems / limit);

    const startIndex = (page - 1) * limit;

    const paginatedDatasets = datasets.slice(startIndex, startIndex + limit);

    return NextResponse.json(
      {
        success: true,
        data: paginatedDatasets,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/v1/offline/datasets]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve datasets.",
      },
      { status: 500 },
    );
  }
}
