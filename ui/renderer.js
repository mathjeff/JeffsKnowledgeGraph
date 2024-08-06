function setupInterface() {
  console.log("setting up interface")

  analyzeGraph()

  goToNode(rootNode["name"])
  console.log("done setting up interface")
}

function analyzeGraph() {
  makeRootNode()
  groupNodesByName()
  findDependents()
}

function groupNodesByName() {
  nodesByName = {}
  for (i = 0; i < knowledgeGraph.length; i++) {
    node = knowledgeGraph[i]
    name = node["name"]
    nodesByName[name] = node
  }
  nodesByName[rootNode["name"]] = rootNode
}

function makeRootNode() {
  rootNode = {"name":"Welcome", "description":"This is Jeff's Knowledge Graph", dependencies:[]}
}

function findDependents() {
  nodeDependents = {}
  nodeDependents[rootNode["name"]] = []
  // allocate map of dependents
  for (i = 0; i < knowledgeGraph.length; i++) {
    node = knowledgeGraph[i]
    name = node["name"]
    nodeDependents[name] = []
  }
  // populate map of dependents
  for (i = 0; i < knowledgeGraph.length; i++) {
    node = knowledgeGraph[i]
    name = node["name"]
    if (node.dependencies.length > 0) {
      for (j = 0; j < node.dependencies.length; j++) {
        dependencyName = node.dependencies[j]
        nodeDependents[dependencyName].push(name)
      }
    } else {
      nodeDependents[rootNode["name"]].push(name)
    }
  }
}

function getDependentNames(nodeName) {
  return nodeDependents[nodeName]
}

function getNodeByName(name) {
  result = nodesByName[name]
  return result
}

function makeGoToButton(nodeName) {
  goText = "goToNode(\"" + nodeName + "\")"
  return "<button onclick='" + goText + "'>" + nodeName + "</button>"
}

function goToNode(nodeName) {
  console.log("goToNode '" + nodeName + "'")
  node = getNodeByName(nodeName)
  name = node["name"]
  description = node["description"]
  if (description == null)
    description = ""
  dependencies = node["dependencies"]
  dependents = getDependentNames(nodeName)
  render = "<h1>" + name + "</h1>" +
           "<div>" + description.replaceAll("\n", "<br/>") + "</div>"
  if (dependencies.length > 0) {
    if (description == "")
      dependenciesTitle = "Things to learn:"
    else
      dependenciesTitle = "Confused?"
    render += "<h2>" + dependenciesTitle + "</h2>"
    for (i = 0; i < dependencies.length; i++) {
      dependency = dependencies[i]
      render += makeGoToButton(dependency) + "<br/>"
    }
  }
  if (dependents.length > 0) {
    render += "<h2>Curious?</h2>"
    for (i = 0; i < dependents.length; i++) {
      dependent = dependents[i]
      render += makeGoToButton(dependent) + "<br/>"
    }
  }

  document.getElementById("content").innerHTML = "<div>" + render + "</div>"
}
