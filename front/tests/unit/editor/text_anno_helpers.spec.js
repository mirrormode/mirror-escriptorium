import {
    getTextPositionSelector,
    withTextQuoteSelector,
} from "../../../src/editor/text_anno_helpers.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const posSelector = { type: "TextPositionSelector", start: 5, end: 10 };
const quoteSelector = { type: "TextQuoteSelector", exact: "world" };

function makeAnnotation({ target }) {
    return { id: "test-id", type: "Annotation", target };
}

// ---------------------------------------------------------------------------
// getTextPositionSelector
// ---------------------------------------------------------------------------

describe("getTextPositionSelector", () => {
    it("returns null when annotation has no target", () => {
        expect(getTextPositionSelector({})).toBeNull();
    });

    it("returns null when target has no selector", () => {
        const anno = makeAnnotation({ target: { source: "http://example.com" } });
        expect(getTextPositionSelector(anno)).toBeNull();
    });

    it("finds the selector when target.selector is a single object", () => {
        const anno = makeAnnotation({ target: { selector: posSelector } });
        expect(getTextPositionSelector(anno)).toBe(posSelector);
    });

    it("finds the selector when target.selector is an array", () => {
        const anno = makeAnnotation({
            target: { selector: [quoteSelector, posSelector] },
        });
        expect(getTextPositionSelector(anno)).toBe(posSelector);
    });

    it("handles target as an array (picks first element)", () => {
        const anno = makeAnnotation({
            target: [{ selector: [posSelector] }],
        });
        expect(getTextPositionSelector(anno)).toBe(posSelector);
    });

    it("returns null when no TextPositionSelector is present in the array", () => {
        const anno = makeAnnotation({
            target: { selector: [quoteSelector] },
        });
        expect(getTextPositionSelector(anno)).toBeNull();
    });

    it("skips null/undefined entries in selector array", () => {
        const anno = makeAnnotation({
            target: { selector: [null, undefined, posSelector] },
        });
        expect(getTextPositionSelector(anno)).toBe(posSelector);
    });
});

// ---------------------------------------------------------------------------
// withTextQuoteSelector
// ---------------------------------------------------------------------------

function makeContainer(text) {
    return { textContent: text };
}

describe("withTextQuoteSelector", () => {
    it("returns the annotation unchanged when target has no selector", () => {
        const anno = makeAnnotation({ target: { source: "x" } });
        const container = makeContainer("hello world");
        expect(withTextQuoteSelector(anno, container)).toBe(anno);
    });

    it("returns the annotation unchanged when TextQuoteSelector already exists", () => {
        const anno = makeAnnotation({
            target: { selector: [posSelector, quoteSelector] },
        });
        const container = makeContainer("hello world");
        expect(withTextQuoteSelector(anno, container)).toBe(anno);
    });

    it("returns the annotation unchanged when no TextPositionSelector is present", () => {
        const anno = makeAnnotation({
            target: { selector: [quoteSelector] },
        });
        const container = makeContainer("hello world");
        expect(withTextQuoteSelector(anno, container)).toBe(anno);
    });

    it("synthesises a TextQuoteSelector from the container text", () => {
        // "hello world foo" — select "world" at [6, 11)
        const text = "hello world foo";
        const pos = { type: "TextPositionSelector", start: 6, end: 11 };
        const anno = makeAnnotation({ target: { selector: [pos] } });
        const container = makeContainer(text);

        const result = withTextQuoteSelector(anno, container);
        const selectors = result.target.selector;
        const added = selectors.find((s) => s.type === "TextQuoteSelector");

        expect(added).toBeDefined();
        expect(added.exact).toBe("world");
        expect(added.prefix).toBe("hello ");
        expect(added.suffix).toBe(" foo");
    });

    it("prefix is capped to 32 chars before start", () => {
        const prefix = "a".repeat(40);
        const text = prefix + "X" + "b".repeat(40);
        const pos = { type: "TextPositionSelector", start: 40, end: 41 };
        const anno = makeAnnotation({ target: { selector: [pos] } });

        const result = withTextQuoteSelector(anno, makeContainer(text));
        const added = result.target.selector.find(
            (s) => s.type === "TextQuoteSelector",
        );
        expect(added.prefix).toBe("a".repeat(32));
    });

    it("suffix is capped to 32 chars after end", () => {
        const text = "X" + "b".repeat(40);
        const pos = { type: "TextPositionSelector", start: 0, end: 1 };
        const anno = makeAnnotation({ target: { selector: [pos] } });

        const result = withTextQuoteSelector(anno, makeContainer(text));
        const added = result.target.selector.find(
            (s) => s.type === "TextQuoteSelector",
        );
        expect(added.suffix).toBe("b".repeat(32));
    });

    it("preserves the original TextPositionSelector in the result", () => {
        const pos = { type: "TextPositionSelector", start: 0, end: 5 };
        const anno = makeAnnotation({ target: { selector: [pos] } });
        const result = withTextQuoteSelector(anno, makeContainer("hello world"));
        expect(result.target.selector).toContain(pos);
    });

    it("handles target as an array", () => {
        const pos = { type: "TextPositionSelector", start: 0, end: 5 };
        const anno = makeAnnotation({ target: [{ selector: [pos] }] });
        const result = withTextQuoteSelector(anno, makeContainer("hello world"));
        const added = result.target.selector.find(
            (s) => s.type === "TextQuoteSelector",
        );
        expect(added.exact).toBe("hello");
    });

    it("does not mutate the original annotation", () => {
        const pos = { type: "TextPositionSelector", start: 0, end: 5 };
        const original = makeAnnotation({ target: { selector: [pos] } });
        const originalSelectorsLength = original.target.selector.length;
        withTextQuoteSelector(original, makeContainer("hello world"));
        expect(original.target.selector.length).toBe(originalSelectorsLength);
    });
});
