// DiploPanel imports floating-vue (needs Web Crypto) and @recogito/text-annotator.
// Mock both so we can import the component and test its pure methods.
jest.mock("floating-vue", () => ({ Dropdown: {} }));
jest.mock("@recogito/text-annotator", () => ({
    createTextAnnotator: jest.fn(),
    W3CTextFormat: jest.fn(),
}));

import DiploPanel from "../../../vue/components/DiploPanel.vue";

const { getAPITextAnnotationBody, textAnnoStyle } = DiploPanel.methods;

// ---------------------------------------------------------------------------
// getAPITextAnnotationBody
// ---------------------------------------------------------------------------

/**
 * Build a mock context with enough refs/store to exercise getAPITextAnnotationBody.
 * lineTexts: array of strings, one per line, in order.
 * linePks: array of pk integers matching each line.
 */
function makeCtx(lineTexts, linePks) {
    const diploLineComponents = lineTexts.map((text, i) => ({
        getEl: () => ({ textContent: text }),
        line: { pk: linePks[i] },
    }));
    return {
        $refs: { diploLineComponents },
        $store: { state: { parts: { pk: 1 } } },
        // getAPIAnnotationBody from the AnnoPanel mixin — provide a minimal stub
        getAPIAnnotationBody(annotation) {
            return {
                part: 1,
                taxonomy: null,
                comments: [],
                components: [],
            };
        },
    };
}

describe("DiploPanel.getAPITextAnnotationBody", () => {
    it("finds start_line and end_line within the same line", () => {
        // "Hello world" (11 chars). Select chars 6-11 ("world").
        const ctx = makeCtx(["Hello world", "Second line"], [10, 11]);
        const annotation = { taxonomy: null, body: [] };
        const offsets = { start: 6, end: 11 };

        const result = getAPITextAnnotationBody.call(ctx, annotation, offsets);

        expect(result.start_line).toBe(10);
        expect(result.start_offset).toBe(6);
        expect(result.end_line).toBe(10);
        expect(result.end_offset).toBe(11);
    });

    it("finds start and end on different lines for a cross-line selection", () => {
        // Line 0: "abc" (3 chars), line 1: "defgh" (5 chars).
        // Selecting "cd" → start=2 (in line0), end=5 (in line1, offset 1).
        const ctx = makeCtx(["abc", "defgh"], [20, 21]);
        const annotation = { taxonomy: null, body: [] };
        const offsets = { start: 2, end: 5 };

        const result = getAPITextAnnotationBody.call(ctx, annotation, offsets);

        expect(result.start_line).toBe(20);
        expect(result.start_offset).toBe(2);
        expect(result.end_line).toBe(21);
        expect(result.end_offset).toBe(2); // 5 - 3 (length of first line)
    });

    it("handles selection starting at offset 0", () => {
        const ctx = makeCtx(["Hello"], [5]);
        const annotation = { taxonomy: null, body: [] };

        const result = getAPITextAnnotationBody.call(
            ctx, annotation, { start: 0, end: 5 },
        );

        expect(result.start_line).toBe(5);
        expect(result.start_offset).toBe(0);
        expect(result.end_line).toBe(5);
        expect(result.end_offset).toBe(5);
    });

    it("handles selection that ends exactly at the boundary of a line", () => {
        // Line 0: "abc" (3), line 1: "def" (3). Select all of line 0 → end=3.
        const ctx = makeCtx(["abc", "def"], [1, 2]);
        const annotation = { taxonomy: null, body: [] };

        const result = getAPITextAnnotationBody.call(
            ctx, annotation, { start: 0, end: 3 },
        );

        expect(result.start_line).toBe(1);
        expect(result.end_line).toBe(1);
        expect(result.end_offset).toBe(3);
    });

    it("sets transcription when provided via body.transcription", () => {
        const ctx = makeCtx(["Hello"], [5]);
        ctx.selectedTranscription = 99;
        const annotation = { taxonomy: null, body: [] };

        const result = getAPITextAnnotationBody.call(
            ctx, annotation, { start: 0, end: 5 },
        );
        // The method itself doesn't set transcription; DiploPanel's createAnnotation
        // sets it on the body after calling this helper. Confirm it's not clobbered.
        expect(result.transcription).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// textAnnoStyle
// ---------------------------------------------------------------------------

function makeTaxo(marker_type, marker_detail = "#ff0000") {
    return { marker_type, marker_detail };
}

describe("DiploPanel.textAnnoStyle", () => {
    it("returns undefined when no taxonomy is found and no currentTaxonomy", () => {
        const ctx = { _taxoMap: {}, currentTaxonomy: null };
        const result = textAnnoStyle.call(ctx, { id: "x" });
        expect(result).toBeUndefined();
    });

    it("falls back to currentTaxonomy when annotation id is not in _taxoMap", () => {
        const taxo = makeTaxo("Background Color", "#00ff00");
        const ctx = { _taxoMap: {}, currentTaxonomy: taxo };
        const result = textAnnoStyle.call(ctx, { id: "x" });
        expect(result).toBeDefined();
        expect(result.fill).toBe("#00ff00");
    });

    it("returns Background Color style with fill and underline", () => {
        const taxo = makeTaxo("Background Color", "#abcdef");
        const ctx = { _taxoMap: { "a1": taxo }, currentTaxonomy: null };
        const result = textAnnoStyle.call(ctx, { id: "a1" });
        expect(result).toMatchObject({
            fill: "#abcdef",
            fillOpacity: 0.2,
            underlineColor: "#abcdef",
            underlineStyle: "solid",
            underlineThickness: 2,
        });
    });

    it("returns Text Color style with transparent fill and underline", () => {
        const taxo = makeTaxo("Text Color", "#123456");
        const ctx = { _taxoMap: { "a1": taxo }, currentTaxonomy: null };
        const result = textAnnoStyle.call(ctx, { id: "a1" });
        expect(result).toMatchObject({
            fill: "transparent",
            fillOpacity: 0,
            underlineColor: "#123456",
            underlineStyle: "solid",
        });
    });

    it("returns a subtle fill for Bold marker type", () => {
        const taxo = makeTaxo("Bold", "#ff0000");
        const ctx = { _taxoMap: { "a1": taxo }, currentTaxonomy: null };
        const result = textAnnoStyle.call(ctx, { id: "a1" });
        expect(result).toMatchObject({ fill: "#ff0000", fillOpacity: 0.15 });
    });

    it("returns a subtle fill for Italic marker type", () => {
        const taxo = makeTaxo("Italic", "#0000ff");
        const ctx = { _taxoMap: { "a1": taxo }, currentTaxonomy: null };
        const result = textAnnoStyle.call(ctx, { id: "a1" });
        expect(result).toMatchObject({ fill: "#0000ff", fillOpacity: 0.15 });
    });

    it("returns undefined for an unrecognised marker type", () => {
        const taxo = makeTaxo("Strikethrough", "#ff0000");
        const ctx = { _taxoMap: { "a1": taxo }, currentTaxonomy: null };
        const result = textAnnoStyle.call(ctx, { id: "a1" });
        expect(result).toBeUndefined();
    });
});
