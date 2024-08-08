function setupInterface() {
  console.log("setting up interface")

  analyzeGraph()
  resetFamiliarity()

  goToNode(rootNode["index"], "init")
  console.log("done setting up interface")
}

function analyzeGraph() {
  makeRootNode()
  numberNodes()
  groupNodesByName()
  findDependents()
}

function resetFamiliarity() {
  nodeHistory = []
  // names of nodes that the user is probably interested in
  curiosityByName = {}
  // names of nodes that the user is probably already familiar with
  familiarityByName = {}
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

function getDirectDependencyNames(nodeName) {
  node = nodesByName[nodeName]
  return node["dependencies"]
}

// make a guess about how to help a user that is very confused
function getSoConfusedHelpNames(nodeName) {
  return getDirectDependencyNames(nodeName)
}

function getDirectDependentNames(nodeName) {
  return nodeDependents[nodeName]
}

// make a guess about how to help a user that is already familiar with this
function getAlreadyFamiliarHelpNames(nodeName) {
  return getDirectDependentNames(nodeName)
}

// Declares whether the user is familiar with this node
// Doesn't make any other guesses based on user behavior
function declareFamiliarity(nodeName, familiar) {
  console.log("familiarity = " + familiar + " for " + nodeName)
  familiarityByName[nodeName] = familiar
}

// Declares whether the user is curious about this node
// Doesn't make any other guesses based on user behavior
function declareCuriosity(nodeName, curious) {
  console.log("curiousity = " + curious + " for " + nodeName)
  curiosityByName[nodeName] = curious
}


function getNodeByName(name) {
  result = nodesByName[name]
  return result
}

function makeGoToButton(nodeName, actionType) {
  node = nodesByName[nodeName]
  nodeIndex = node["index"]
  goText = "goToNode(" + nodeIndex + ", \"" + actionType + "\")"
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
  labelHtml = "<div>Search " + knowledgeGraph.length + " entries:</div>"
  inputHtml = '<input type="text" id="query" onkeypress="queryBoxKeyPress(event)">'
  return labelHtml + inputHtml
}

function makeNodeList(nodeNames, actionType) {
  html = ""
  for (i = 0; i < nodeNames.length; i++) {
    dependency = nodeNames[i]
    html += makeGoToButton(dependency, actionType) + "<br/>"
  }
  return html
}

function formatDescription(descriptionText) {
  return marked.parse(descriptionText)
}

function makeTable(columns) {
  result = ""
  result += "<table>"
  result += "<tr>"
  for (i = 0; i < columns.length; i++) {
    column = columns[i]
    result += "<th>" + column["name"] + "</th>"
  }
  result += "</tr>\n"
  result += "<tr>"
  for (i = 0; i < columns.length; i++) {
    column = columns[i]
    result += "<td>" + column["content"] + "</td>\n"
  }
  result += "</table>"
  return result
}

// updates our information about what the user knows and is interested in
function updateUserKnowledgeData(actionType) {
  if (nodeHistory.length < 1)
    return // the user hasn't visited any nodes yet
  currentNode = nodeHistory[nodeHistory.length - 1]
  nodeName = currentNode["name"]
  if (actionType == "curious") {
    // If the user is curious about more details, then the user is familiar with the existing information
    declareFamiliarity(nodeName, true)
    return
  }
  if (actionType == "confused") {
    // If the user mentions being confused, then the user is probably interested in this
    declareCuriosity(nodeName, true)
    // If the user mentions being confused, it means the user is not familiar with this
    declareFamiliarity(nodeName, false)
    return
  }
  if (actionType == "alreadyFamiliar") {
    // the user knows about this and probably knows about the dependents
    declareFamiliarity(nodeName, true)
    return
  }
}

function goToNode(nodeIndex, actionType) {
  node = knowledgeGraph[nodeIndex]
  updateUserKnowledgeData(actionType)
  nodeName = node["name"]
  console.log("goToNode '" + nodeName + "' actionType = " + actionType)
  nodeHistory.push(node)
  name = node["name"]
  description = node["description"]
  if (description == null)
    description = ""
  dependencies = getDirectDependencyNames(nodeName)
  soConfusedHelpNames = getSoConfusedHelpNames(nodeName)
  dependents = getDirectDependentNames(nodeName)
  alreadyFamiliarHelpNames = getAlreadyFamiliarHelpNames(nodeName)
  render = ""
  render += makeHomeButton() + makeBackButton()
  render += "<h1>" + name + "</h1>"
  render += "<div>" + formatDescription(description) + "</div>"
  if (node == rootNode)
    render += makeSearchBox()

  render += "<div id=\"search-results\"></div>"
  linksInformation = []
  if (soConfusedHelpNames.length > 0) {
    //linksInformation.push({"name":"I'm so confused.", "content":makeNodeList(soConfusedHelpNames, "confused")})
  }

  if (dependencies.length > 0) {
    if (description == "")
      dependenciesTitle = "Things to learn:"
    else
      dependenciesTitle = "Explain."
    linksInformation.push({"name":dependenciesTitle, "content":makeNodeList(dependencies, "confused")})
  }
  if (dependents.length > 0) {
    linksInformation.push({"name":"That's interesting.", "content":makeNodeList(dependents, "curious")})
  }
  if (alreadyFamiliarHelpNames.length > 0) {
    //linksInformation.push({"name":"I already knew this.", "content":makeNodeList(alreadyFamiliarHelpNames, "curious")})
  }
  render += makeTable(linksInformation)

  document.getElementById("content").innerHTML = "<div>" + render + "</div>"
}

function goHome() {
  goToNode(rootNode["index"], "home")
}

function goBack() {
  if (nodeHistory.length >= 2) {
    // identify the previous node
    previousNode = nodeHistory[nodeHistory.length - 2]
    // remove the current node from the history
    nodeHistory.pop()
    // jump to the previous node
    goToNode(previousNode["index"], "back")
    // jumping to the previous node adds it to the history, so remove that new entry now too
    nodeHistory.pop()
  }
}
