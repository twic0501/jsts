import { describe, expect, it } from "vitest";
import { validateGroundedClaims, type Evidence } from "@paper-galaxy/core";

const evidence: Evidence[] = [
  {
    id: "E1",
    paperId: "1505.04597",
    title: "U-Net: Convolutional Networks for Biomedical Image Segmentation",
    url: "https://arxiv.org/abs/1505.04597",
    quote:
      "The architecture consists of a contracting path to capture context and a symmetric expanding path that enables precise localization.",
    start: 0,
    end: 130,
    cosine: 0.9,
    fusionScore: 0.03,
    coverage: "abstract",
  },
];

describe("grounded claim quote provenance", () => {
  it("accepts a quote copied exactly from the cited evidence", () => {
    const raw = {
      claims: [
        {
          text: "U-Net uses contracting and expanding paths.",
          evidenceIds: ["E1"],
          supportingQuotes: [
            {
              evidenceId: "E1",
              quote:
                "The architecture consists of a contracting path to capture context and a symmetric expanding path that enables precise localization.",
            },
          ],
        },
      ],
    };

    const result = validateGroundedClaims(raw, evidence, {
      requireQuotes: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.supportingQuotes?.[0]?.evidenceId).toBe("E1");
  });

  it("allows whitespace differences while preserving the quote text", () => {
    const raw = {
      claims: [
        {
          text: "U-Net has two paths.",
          evidenceIds: ["E1"],
          supportingQuotes: [
            {
              evidenceId: "E1",
              quote:
                "The architecture consists of a contracting path to capture context and a symmetric  expanding path that enables precise localization.",
            },
          ],
        },
      ],
    };

    expect(() =>
      validateGroundedClaims(raw, evidence, { requireQuotes: true }),
    ).not.toThrow();
  });

  it("rejects a claim without supportingQuotes in strict mode", () => {
    const raw = {
      claims: [
        {
          text: "U-Net uses data augmentation.",
          evidenceIds: ["E1"],
        },
      ],
    };

    expect(() =>
      validateGroundedClaims(raw, evidence, { requireQuotes: true }),
    ).toThrow(/thiếu đoạn trích/i);
  });

  it("rejects a quote that does not occur in the cited evidence", () => {
    const raw = {
      claims: [
        {
          text: "U-Net improves speed ten times.",
          evidenceIds: ["E1"],
          supportingQuotes: [
            {
              evidenceId: "E1",
              quote:
                "U-Net improves processing speed by ten times in every experiment.",
            },
          ],
        },
      ],
    };

    expect(() =>
      validateGroundedClaims(raw, evidence, { requireQuotes: true }),
    ).toThrow(/không khớp nguyên văn/i);
  });

  it("rejects evidenceIds that do not match supportingQuotes", () => {
    const raw = {
      claims: [
        {
          text: "U-Net uses two paths.",
          evidenceIds: ["E1", "E2"],
          supportingQuotes: [
            {
              evidenceId: "E1",
              quote:
                "The architecture consists of a contracting path to capture context and a symmetric expanding path that enables precise localization.",
            },
          ],
        },
      ],
    };

    expect(() =>
      validateGroundedClaims(raw, evidence, { requireQuotes: true }),
    ).toThrow();
  });

  it("rejects an unknown evidence ID", () => {
    const raw = {
      claims: [
        {
          text: "A claim with a fabricated citation.",
          evidenceIds: ["E9"],
          supportingQuotes: [
            {
              evidenceId: "E9",
              quote: "This quote is not in the retrieved evidence.",
            },
          ],
        },
      ],
    };

    expect(() =>
      validateGroundedClaims(raw, evidence, { requireQuotes: true }),
    ).toThrow(/không nằm trong tài liệu/i);
  });

  it("keeps legacy ID-only validation available for old callers", () => {
    const raw = {
      claims: [
        {
          text: "Legacy claim.",
          evidenceIds: ["E1"],
        },
      ],
    };

    expect(validateGroundedClaims(raw, evidence)).toHaveLength(1);
  });
});
