const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USER_ID = "pratiklakra";
const EMAIL_ID = "pratik.lakra.btech2023@sitpune.edu.in";
const ENROLLMENT = "23-27BTECHCSE";

function validateEdge(raw) {
  const trimmed = raw.trim();
  const valid = /^[A-Z]->[A-Z]$/.test(trimmed);
  return { trimmed, valid };
}

function buildGraph(edges) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seen = new Set();
  const validEdges = [];

  for (const raw of edges) {
    const { trimmed, valid } = validateEdge(raw);

    if (!valid) {
      invalid_entries.push(raw.trim() === raw ? raw : raw);
      continue;
    }

    const [parent, child] = trimmed.split("->");

    if (parent === child) {
      invalid_entries.push(trimmed);
      continue;
    }

    if (seen.has(trimmed)) {
      if (!duplicate_edges.includes(trimmed)) {
        duplicate_edges.push(trimmed);
      }
      continue;
    }

    seen.add(trimmed);
    validEdges.push([parent, child]);
  }

  const children = {};
  const parentOf = {};

  for (const [p, c] of validEdges) {
    if (parentOf[c] !== undefined) {
      continue;
    }

    parentOf[c] = p;

    if (!children[p]) children[p] = [];
    children[p].push(c);
  }

  const allNodes = new Set();

  for (const [p, c] of validEdges) {
    allNodes.add(p);
    allNodes.add(c);
  }

  const childNodes = new Set(Object.keys(parentOf));
  let roots = [...allNodes].filter((n) => !childNodes.has(n)).sort();

  const adj = {};

  for (const n of allNodes) {
    adj[n] = new Set();
  }

  for (const [p, c] of validEdges) {
    if (parentOf[c] === p) {
      adj[p].add(c);
      adj[c].add(p);
    }
  }

  function getComponent(start) {
    const visited = new Set();
    const queue = [start];

    while (queue.length) {
      const n = queue.shift();

      if (visited.has(n)) continue;

      visited.add(n);

      for (const nb of adj[n]) {
        queue.push(nb);
      }
    }

    return visited;
  }

  const assigned = new Set();
  const components = [];

  for (const n of [...allNodes].sort()) {
    if (!assigned.has(n)) {
      const comp = getComponent(n);

      for (const m of comp) {
        assigned.add(m);
      }

      components.push(comp);
    }
  }

  function hasCycle(nodes) {
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    const color = {};

    for (const n of nodes) {
      color[n] = WHITE;
    }

    function dfs(u) {
      color[u] = GRAY;

      for (const v of (children[u] || [])) {
        if (!nodes.has(v)) continue;

        if (color[v] === GRAY) return true;

        if (color[v] === WHITE && dfs(v)) {
          return true;
        }
      }

      color[u] = BLACK;
      return false;
    }

    for (const n of nodes) {
      if (color[n] === WHITE && dfs(n)) {
        return true;
      }
    }

    return false;
  }

  function buildTree(node) {
    const obj = {};

    for (const child of (children[node] || [])) {
      obj[child] = buildTree(child);
    }

    return obj;
  }

  function treeDepth(node) {
    const kids = children[node] || [];

    if (kids.length === 0) return 1;

    return 1 + Math.max(...kids.map(treeDepth));
  }

  const hierarchies = [];
  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = null;
  let largest_depth = -1;

  for (const comp of components) {
    const cyclic = hasCycle(comp);

    const compRoots = roots.filter((r) => comp.has(r)).sort();

    let root;

    if (compRoots.length > 0) {
      root = compRoots[0];
    } else {
      root = [...comp].sort()[0];
    }

    if (cyclic) {
      total_cycles++;

      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
    } else {
      total_trees++;

      const tree = {
        [root]: buildTree(root),
      };

      const depth = treeDepth(root);

      hierarchies.push({
        root,
        tree,
        depth,
      });

      if (
        depth > largest_depth ||
        (depth === largest_depth && root < largest_tree_root)
      ) {
        largest_depth = depth;
        largest_tree_root = root;
      }
    }
  }

  hierarchies.sort((a, b) => {
    if (!!a.has_cycle === !!b.has_cycle) {
      return a.root < b.root ? -1 : 1;
    }

    return a.has_cycle ? 1 : -1;
  });

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    enrollment_number: ENROLLMENT,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root: largest_tree_root || "",
    },
  };
}

app.post("/api/graph", (req, res) => {
  try {
    const { edges } = req.body;

    if (!Array.isArray(edges)) {
      return res.status(400).json({
        error: "'edges' must be an array.",
      });
    }

    const result = buildGraph(edges);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Internal server error.",
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});