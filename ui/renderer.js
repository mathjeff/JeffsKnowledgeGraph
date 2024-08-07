function setupInterface() {
  console.log("setting up interface")

  analyzeGraph()

  goToNode(rootNode["index"])
  console.log("done setting up interface")
}

function analyzeGraph() {
  emptyHistory()
  makeRootNode()
  numberNodes()
  groupNodesByName()
  findDependents()
}

function emptyHistory() {
  nodeHistory = []
}

function numberNodes() {
  for (i = 0; i < knowledgeGraph.length; i++) {
    knowledgeGraph[i]["index"] = i
  }
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
  rootNode = {"name":"Welcome to Jeff's Knowledge Graph", "description":"", dependencies:[]}
  knowledgeGraph.push(rootNode)
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
      if (node != rootNode)
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
  node = nodesByName[nodeName]
  nodeIndex = node["index"]
  goText = "goToNode(\"" + nodeIndex + "\")"
  return "<button onclick='" + goText + "'>" + nodeName + "</button>"
}

function makeHomeButton() {
  return "<button onclick='goHome()'>Home</button>"
}

function makeBackButton() {
  return "<button onclick='goBack()'>Back</button>"
}

function getMatchScore(queryText, node) {
  score = 0
  queryText = queryText.toUpperCase()
  if (node["name"].toUpperCase().includes(queryText)) {
    score += 2
  } else {
    description = node["description"]
    if (description != null) {
      if (description.toUpperCase().includes(queryText))
        score += 1
    }
  }
  return score
}

function findQueryResults(queryText) {
  // find the best few matches
  matches = []
  targetNumMatches = 5
  for (i = 0; i < knowledgeGraph.length; i++) {
    node = knowledgeGraph[i]
    score = getMatchScore(queryText, node)
    if (score > 0) {
      insertIndex = matches.length
      for (j = 0; j < matches.length; j++) {
        other = matches[j]
        if (score > other["score"]) {
          insertIndex = j
          break
        }
      }
      matches.splice(insertIndex, 0, {"node": node, "score": score})
      if (matches.length > targetNumMatches) {
        matches.pop()
      }
    }
  }

  console.log("query text " + queryText)
  console.log("result:")
  console.log(matches)
  results = []
  for (i = 0; i < matches.length; i++) {
    results.push(matches[i]["node"]["name"])
  }
  return results
}

function runQuery(queryText) {
  queryResults = findQueryResults(queryText)
  if (queryResults.length > 0) {
    html = makeNodeList(queryResults)
  } else {
    html = "<div>No results found</div>"
  }
  document.getElementById("search-results").innerHTML = html
}

function queryBoxKeyPress(event) {
  if (event.key == "Enter") {
    queryBox = document.getElementById("query")
    queryText = queryBox.value
    runQuery(queryText)
  }
}

function makeSearchBox() {
  labelHtml = "<div>Search:</div>"
  inputHtml = '<input type="text" id="query" onkeypress="queryBoxKeyPress(event)">'
  return labelHtml + inputHtml
}

function makeNodeList(nodeNames) {
  html = ""
  for (i = 0; i < nodeNames.length; i++) {
    dependency = nodeNames[i]
    html += makeGoToButton(dependency) + "<br/>"
  }
  return html
}

function goToNode(nodeIndex) {
  node = knowledgeGraph[nodeIndex]
  nodeName = node["name"]
  console.log("goToNode '" + nodeName + "'")
  nodeHistory.push(node)
  name = node["name"]
  description = node["description"]
  if (description == null)
    description = ""
  dependencies = node["dependencies"]
  dependents = getDependentNames(nodeName)
  render = ""
  render += makeHomeButton() + makeBackButton()
  render += "<h1>" + name + "</h1>"
  render += "<div>" + description.replaceAll("\n", "<br/>") + "</div>"
  if (node == rootNode)
    render += makeSearchBox()

  render += "<div id=\"search-results\"></div>"
  if (dependencies.length > 0) {
    if (description == "")
      dependenciesTitle = "Things to learn:"
    else
      dependenciesTitle = "Confused?"
    render += "<h2>" + dependenciesTitle + "</h2>"
    render += makeNodeList(dependencies)
  }
  if (dependents.length > 0) {
    render += "<h2>Curious?</h2>"
    render += makeNodeList(dependents)
  }

  document.getElementById("content").innerHTML = "<div>" + render + "</div>"
}

function goHome() {
  goToNode(rootNode["index"])
}

function goBack() {
  if (nodeHistory.length >= 2) {
    // identify the previous node
    previousNode = nodeHistory[nodeHistory.length - 2]
    // remove the current node from the history
    nodeHistory.pop()
    // jump to the previous node
    goToNode(previousNode["index"])
    // jumping to the previous node adds it to the history, so remove that new entry now too
    nodeHistory.pop()
  }
}
