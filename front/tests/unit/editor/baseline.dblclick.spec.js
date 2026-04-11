/**
 * Tests for the double-click segment insertion fix.
 *
 * Bug: browser fires dblclick AFTER the second mouseup, so tool.onMouseUp
 * (which calls updateDataFromCanvas) ran before the new segment existed.
 * The segment appeared on-screen but was never sent to the server.
 *
 * Fix: onDoubleClick now calls line.updateDataFromCanvas() after inserting
 * the new segment.
 */

import { Segmenter } from "../../../src/baseline.editor";

// Build a minimal SegmenterLine-like stub that replicates the
// onDoubleClick handler as registered by bindLineEvents.
function makeLineLike(segmenter) {
    const line = {
        updateDataFromCanvas: jest.fn(),
        baselinePath: {
            getNearestLocation: jest.fn(() => ({ index: 1, point: { x: 5, y: 5 } })),
            insert: jest.fn(),
            onDoubleClick: null,
            onMouseDown: null,
            onMouseMove: null,
            onMouseLeave: null,
        },
        maskPath: null,
        selected: false,
        refresh: jest.fn(),
    };
    return line;
}

function makeSegmenter() {
    // Minimal segmenter stub — only the fields consulted inside bindLineEvents.
    return {
        mode: "lines",
        activeTool: "select",
        splitting: false,
        selecting: null,
        selection: { segments: [], lines: [], regions: [] },
        tool: { onMouseDrag: null, onMouseUp: null },
        addToSelection: jest.fn(),
        removeFromSelection: jest.fn(),
        movePointInView: jest.fn(),
        setCursor: jest.fn(),
        onMouseUp: jest.fn(),
        resetToolEvents: jest.fn(),
    };
}

describe("bindLineEvents — onDoubleClick", () => {
    let segmenter, line;

    beforeEach(() => {
        segmenter = makeSegmenter();
        line = makeLineLike(segmenter);

        // Call the real bindLineEvents to attach the handler.
        Segmenter.prototype.bindLineEvents.call(segmenter, line);
    });

    it("inserts a segment at the nearest location on the path", () => {
        const fakeEvent = { event: { ctrlKey: false } };
        line.baselinePath.onDoubleClick(fakeEvent);

        expect(line.baselinePath.getNearestLocation).toHaveBeenCalled();
        expect(line.baselinePath.insert).toHaveBeenCalledWith(2, expect.anything());
    });

    it("calls updateDataFromCanvas after inserting so the new point is saved", () => {
        const fakeEvent = { event: { ctrlKey: false } };
        line.baselinePath.onDoubleClick(fakeEvent);

        expect(line.updateDataFromCanvas).toHaveBeenCalledTimes(1);
        // Must come AFTER insert — verify call order
        const insertOrder = line.baselinePath.insert.mock.invocationCallOrder[0];
        const updateOrder = line.updateDataFromCanvas.mock.invocationCallOrder[0];
        expect(updateOrder).toBeGreaterThan(insertOrder);
    });

    it("does nothing when Ctrl is held (no insert, no updateDataFromCanvas)", () => {
        const fakeEvent = { event: { ctrlKey: true } };
        line.baselinePath.onDoubleClick(fakeEvent);

        expect(line.baselinePath.insert).not.toHaveBeenCalled();
        expect(line.updateDataFromCanvas).not.toHaveBeenCalled();
    });

    it("does nothing when mode is not 'lines'", () => {
        segmenter.mode = "regions";
        const fakeEvent = { event: { ctrlKey: false } };
        line.baselinePath.onDoubleClick(fakeEvent);

        expect(line.baselinePath.insert).not.toHaveBeenCalled();
        expect(line.updateDataFromCanvas).not.toHaveBeenCalled();
    });
});
