nodesByName = {}
function setupInterface() {
  console.log("setting up interface")
  console.log("data:")
  console.log(knowledgeGraph)

  analyzeGraph()

  goToNode("Using the terminal efficiently")
  console.log("done setting up interface")
}

function analyzeGraph() {
  for (i = 0; i < knowledgeGraph.length; i++) {
    node = knowledgeGraph[i]
    nodesByName[node["name"]] = node
  }
}

function getNodeByName(name) {
  result = nodesByName[name]
  return result
}

function goToNode(nodeName) {
  node = getNodeByName(nodeName)
  name = node["name"]
  description = node["description"]
  dependencies = node["dependencies"]
  render = name + "\n" + description + "\n" + dependencies
  document.getElementById("content").innerHTML = "<div>" + render + "</div>"
}
