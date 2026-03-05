import csv
import json
from datetime import datetime

import networkx as nx
import pandas as pd
from openpyxl.workbook import Workbook
from rdflib import Graph, URIRef, Literal
from rdflib.namespace import RDF, RDFS


def _norm(v):
    if v is None:
        return None
    if isinstance(v, (list, dict)):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, datetime):
        return v.isoformat()
    return v


class DatasetExporter:

    def __init__(self, dataset):
        self.dataset = dataset

    def to_csv(self, folder):

        for name, rows in self.dataset.items():

            path = f"{folder}/{name}.csv"

            with open(path, "w", newline="", encoding="utf-8") as f:

                if not rows:
                    continue

                writer = csv.DictWriter(f,fieldnames=rows[0].keys())

                writer.writeheader()

                for row in rows:
                    writer.writerow({k: _norm(v) for k, v in row.items()})

    def to_excel(self, path):

        wb = Workbook()

        wb.remove(wb.active)

        for name, rows in self.dataset.items():

            ws = wb.create_sheet(name)

            if not rows:
                continue

            ws.append(list(rows[0].keys()))

            for row in rows:
                ws.append([_norm(v) for v in row.values()])

        wb.save(path)


    def to_json(self, path):

        with open(path, "w") as f:
            json.dump(self.dataset, f, indent=2)

    def to_pandas(self):

        frames = {}

        for name, rows in self.dataset.items():
            frames[name] = pd.DataFrame(rows)

        return frames

    def to_networkx(self):

        G = nx.DiGraph()

        # Documents
        for doc in self.dataset.get("documents", []):
            doc_id = doc.get("id")

            node = ("document", doc_id)

            G.add_node(node, type="document", **doc)

        # Parts
        for part in self.dataset.get("parts", []):

            part_id = part.get("id")
            doc_id = part.get("document_id")

            node = ("part", part_id)

            G.add_node(node, type="part", **part)

            if doc_id:
                G.add_edge(("document", doc_id), node)

        # Blocks
        for block in self.dataset.get("blocks", []):

            block_id = block.get("id")
            part_id = block.get("part_id")

            node = ("block", block_id)

            G.add_node(node, type="block", **block)

            if part_id:
                G.add_edge(("part", part_id), node)

        # Lines
        for line in self.dataset.get("lines", []):

            line_id = line.get("id")
            part_id = line.get("part_id")

            node = ("line", line_id)

            G.add_node(node, type="line", **line)

            if part_id:
                G.add_edge(("part", part_id), node)

        # Transcriptions
        for tr in self.dataset.get("transcriptions", []):

            tr_id = tr.get("id")
            line_id = tr.get("line_id")

            node = ("transcription", tr_id)

            G.add_node(node, type="transcription", **tr)

            if line_id:
                G.add_edge(("line", line_id), node)

        return G

    def to_rdf(self):

        g = Graph()

        for doc in self.dataset.get("documents", []):
            uri = URIRef(f"http://example.org/document/{doc['id']}")
            g.add((uri, RDF.type, URIRef("http://example.org/Document")))
            g.add((uri, RDFS.label, Literal(doc.get("name", ""))))


        return g