function setupInterface() {
  console.log("setting up interface")
  console.log("data:")
  console.log(knowledgeGraph)

  analyzeGraph()

  goToNode("What is a terminal?")
  console.log("done setting up interface")
}

function analyzeGraph() {
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
}

function findDependents() {
  nodeDependents = {}
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
    for (j = 0; j < node.dependencies.length; j++) {
      dependencyName = node.dependencies[j]
      console.log("dependency of " + name + " is " + dependencyName)
      nodeDependents[dependencyName].push(name)
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

function goToNode(nodeName) {
  node = getNodeByName(nodeName)
  name = node["name"]
  description = node["description"]
  dependencies = node["dependencies"]
  dependents = getDependentNames(nodeName)
  render = "<h1>" + name + "</h1>" +
           "<div>" + description + "</div>"
  if (dependencies.length > 0) {
    render += "<h2>Confused?</h2>"
    for (i = 0; i < dependencies.length; i++) {
      dependency = dependencies[i]
      render += "<div>" + dependency + "</div>"
    }
  }
  if (dependents.length > 0) {
    render += "<h2>Curious?</h2>"
    for (i = 0; i < dependents.length; i++) {
      dependent = dependents[i]
      render += "<div>" + dependent + "</div>"
    }
  }

  document.getElementById("content").innerHTML = "<div>" + render + "</div>"
}
