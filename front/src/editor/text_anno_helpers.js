/**
 * Extract the TextPositionSelector from a W3C annotation.
 * Handles both array and single-object forms of target and selector.
 */
export function getTextPositionSelector(annotation) {
    const target = Array.isArray(annotation.target)
        ? annotation.target[0]
        : annotation.target;
    if (!target || !target.selector) return null;
    const selectors = Array.isArray(target.selector)
        ? target.selector
        : [target.selector];
    return selectors.find((s) => s && s.type === "TextPositionSelector") || null;
}

/**
 * W3CTextFormat requires both TextPositionSelector and TextQuoteSelector.
 * The server only stores TextPositionSelector, so synthesize the quote
 * selector from the container's current text content when loading.
 */
export function withTextQuoteSelector(w3cAnnotation, container) {
    const target = Array.isArray(w3cAnnotation.target)
        ? w3cAnnotation.target[0]
        : w3cAnnotation.target;
    if (!target || !target.selector) return w3cAnnotation;

    const selectors = Array.isArray(target.selector)
        ? target.selector
        : [target.selector];

    if (selectors.some((s) => s && s.type === "TextQuoteSelector")) {
        return w3cAnnotation;
    }

    const pos = selectors.find((s) => s && s.type === "TextPositionSelector");
    if (!pos) return w3cAnnotation;

    const text = container.textContent;
    const quoteSelector = {
        type: "TextQuoteSelector",
        exact: text.slice(pos.start, pos.end),
        prefix: text.slice(Math.max(0, pos.start - 32), pos.start),
        suffix: text.slice(pos.end, pos.end + 32),
    };

    return {
        ...w3cAnnotation,
        target: { ...target, selector: [...selectors, quoteSelector] },
    };
}
