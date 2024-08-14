function setupInterface() {
  console.log("setting up interface")

  analyzeGraph()
  resetFamiliarity()

  goToInitialNode()
  console.log("done setting up interface")
}

function analyzeGraph() {
  makeRootNode()
  numberNodes()
  groupNodesByName()
  findDependents()
}

var urlParameters = new URLSearchParams(window.location.search);

function goToInitialNode() {
  var startingNodeName = urlParameters.get("initialNode");
  var startingNode = null
  if (startingNodeName) {
    startingNode = nodesByName[startingNodeName]
    if (startingNode == null) {
      console.log("cannot find node with name '" + startingNodeName + "'")
    } else {
      declareCuriosity(startingNodeName)
    }
  }
  if (!startingNode) {
    startingNode = rootNode
  }

  goToNode(startingNode["index"], "init")
}

function resetFamiliarity() {
  nodeHistory = []
  // name of a node that the user is probably directly interested in
  latestCuriosity = null
  // full transitive dependency set of the nodes that the user is interested in
  curiousDependencyNames = new Set()
  // name of a node that the user is probably familiar with
  latestFamiliarity = null
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
  // find everything that the user will need to know to learn this topic
  var allDependencies = getAllDependenciesOf(nodeName)
  //console.log("all dependencies of " + nodeName + ": " + allDependencies.size + " nodes")
  //console.log(allDependencies)
  var fullCount = countNumUnfamiliarDependencies(nodeName)
  var targetCount = fullCount / 2

  // count number of unfamiliar dependencies for each one
  var bestResult = null
  var bestScore = -100000
  for (var candidate of allDependencies) {
    var count = countNumUnfamiliarDependencies(candidate)
    console.log("num unfamiliar dependencies of " + candidate + " is " + count)
    if (count > 0 && count < targetCount) {
      var score = -Math.abs(count - targetCount)
      if (bestResult == null || score >= bestScore) {
        //console.log("updating score from " + bestScore + " to " + score + " by updating node from " + bestResult + " to " + nodeName)
        bestResult = candidate
        bestScore = score
      }
    }
  }

  //console.log("best confused help name for " + nodeName + " = " + bestResult)

  if (bestResult == null) {
    return []
  }
  return [bestResult]
}

function getDirectDependentNames(nodeName) {
  return nodeDependents[nodeName]
}

function getAllFamiliarNodes() {
  var result = new Set()
  for (var key in familiarityByName) {
    var familiar = familiarityByName[key]
    if (familiar)
      result.add(key)
  }
  //console.log("all familiar nodes (" + result.size + "):")
  //console.log(result)
  return result
}

function mergeSets(setA, setB) {
  return new Set([...setA, ...setB])
}

// make a guess about how to help a user that is already familiar with this
function getAlreadyFamiliarHelpNames(nodeName) {
  if (curiousDependencyNames.size < 1) {
    return []
  }

  var curious = curiousDependencyNames
  var familiar = mergeSets(getAllDependenciesOf(nodeName), getAllFamiliarNodes())
  var maxCount = 0
  var items = []

  for (var candidate of curious) {
    var count = countNumDependenciesOutsideSet(candidate, familiar)

    //console.log("candidate " + candidate + " has " + count + " dependencies outside set")
    if (count < 2) {
      // Skip showing nodes that are only slightly more complicated than things we've seen before
      // We already link to slightly more complicated nodes in a separate section
      continue
    }
    items.push({"count":count, "name": candidate})
    maxCount = Math.max(maxCount, count)
  }

  var targetCount = maxCount / 2
  var bestScore = 0
  var bestNode = null
  for (var item of items) {
    var count = item["count"]
    var score = -Math.abs(count - targetCount)
    if (bestNode == null || score > bestScore) {
      bestScore = score
      bestNode = item["name"]
    }
  }

  if (bestNode != null) {
    return [bestNode]
  }

  return []
}

// Declares that the user is familiar with this node
function declareFamiliar(nodeName) {
  if (familiarityByName[nodeName] == true) {
    // already know that this node is familiar
    return
  }

  console.log("familiar with " + nodeName)

  familiarityByName[nodeName] = true
  var dependencies = getDirectDependencyNames(nodeName)
  for (var i = 0; i < dependencies.length; i++) {
    declareFamiliar(dependencies[i])
  }
  latestFamiliarity = nodeName
}

// Declares that the user is unfamiliar with this node
function declareUnfamiliar(nodeName) {
  if (familiarityByName[nodeName] == false) {
    // already know that this node is unfamiliar
    return
  }
  console.log("unfamiliar with " + nodeName)
  familiarityByName[nodeName] = false
  var dependencies = getDirectDependentNames(nodeName)
  for (var i = 0; i < dependencies.length; i++) {
    declareUnfamiliar(dependencies[i])
  }
}

function hasTransitiveDependency(nodeName, candidateDependency) {
  var dependencies = getAllDependenciesOf(nodeName)
  return dependencies.has(candidateDependency)
}

function getAllDependenciesOf(nodeName) {
  var allDependencies = new Set()
  addDependenciesRecursivelyTo(nodeName, allDependencies)
  return allDependencies
}

function addDependenciesRecursivelyTo(newDependency, destinationSet) {
  if (destinationSet.has(newDependency))
    return
  destinationSet.add(newDependency)
  var newDependencies = getDirectDependencyNames(newDependency)
  for (var dependency of newDependencies) {
    //console.log("adding dependency " + dependency + " of " + newDependency)
    addDependenciesRecursivelyTo(dependency, destinationSet)
  }
}

// Declares that the user is curious about this node
function declareCuriosity(nodeName) {
  if (latestCuriosity != null && hasTransitiveDependency(latestCuriosity, nodeName)) {
    // When the user asks about a dependency of their previous curiosity, they're probably still interested in the previous topic too
    return
  }

  latestCuriosity = nodeName
  console.log("curious about " + nodeName);
  curiosityNeedsDependenciesOf(nodeName)
}

function countNumUnfamiliarDependencies(nodeName) {
  // TODO: make this faster: cancel a branch of the dependency search when it reaches a node that's familiar
  var allDependencies = getAllDependenciesOf(nodeName)
  var numUnfamiliarDependencies = 0
  for (var dependency of allDependencies) {
    var familiarity = familiarity = familiarityByName[dependency]
    //console.log("familiarity of " + dependency + " = " + familiarity)
    if (familiarity != true) {
      numUnfamiliarDependencies++
    }
  }
  return numUnfamiliarDependencies
}

function countNumDependenciesOutsideSet(nodeName, baseSet) {
  // TODO: make this faster: cancel a branch of the dependency search when it reaches a node that's familiar
  var allDependencies = getAllDependenciesOf(nodeName)
  var numUnfamiliarDependencies = 0
  for (var dependency of allDependencies) {
    if (!baseSet.has(dependency)) {
      numUnfamiliarDependencies++
    }
  }
  return numUnfamiliarDependencies
}

// Declares that something the user is curious about requires this node
function curiosityNeedsDependenciesOf(nodeName) {
  if (curiousDependencyNames.has(nodeName))
    return
  //console.log("satisfying curiosity requires '" + nodeName + "'")
  curiousDependencyNames.add(nodeName)
  var dependencies = getDirectDependencyNames(nodeName)
  for (var i = 0; i < dependencies.length; i++) {
    dependency = dependencies[i]
    curiosityNeedsDependenciesOf(dependency)
  }
}

function getNodeByName(name) {
  result = nodesByName[name]
  return result
}

function makeGoToButton(nodeName, actionType) {
  node = nodesByName[nodeName]
  nodeIndex = node["index"]
  goText = "goToNode(" + nodeIndex + ", \"" + actionType + "\")"
  actionClass = "button-" + actionType
  return "<button class='knowledge-button " + actionClass + "' onclick='" + goText + "'>" + nodeName + "</button>"
}

function makeHomeButton() {
  return "<button class='knowledge-button' onclick='goHome()'>Home</button>"
}

function makeBackButton() {
  return "<button class='knowledge-button' onclick='goBack()'>Back</button>"
}

function makeExplainSelfButton() {
  return "<button class='knowledge-button' onclick='explainSelf()'>Help</button>"
}

function getBaseUrl() {
  var existingUrl = window.location.href
  var newUrl = existingUrl.replace(/\?.*/, "")
  return newUrl
}

function getPermalink(nodeName) {
  var baseUrl = getBaseUrl()
  var nodeEncoded = encodeURIComponent(nodeName)
  return baseUrl + "?initialNode=" + nodeEncoded
}

function makePermalinkAnchor(nodeName) {
  return '<a href="' + getPermalink(nodeName) + '">Permalink</a>'
}

function getMatchScore(queryText, node) {
  var score = 0
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
    var score = getMatchScore(queryText, node)
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
    html = makeNodeList(queryResults, "searchResult")
  } else {
    html = "<div>No results found. <a href='https://github.com/mathjeff/JeffsKnowledgeGraph/issues/new'>Open an issue</a></div>"
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

function getCurrentNode() {
  return nodeHistory[nodeHistory.length - 1]
}

// updates our information about what the user knows and is interested in
function updateUserKnowledgeData(actionType) {
  if (nodeHistory.length < 1)
    return // the user hasn't visited any nodes yet
  currentNode = getCurrentNode()
  nodeName = currentNode["name"]
  if (actionType == "curious") {
    // If the user is curious about more details, then the user is familiar with the existing information
    declareFamiliar(nodeName)
    return
  }
  if (actionType == "confused") {
    // If the user mentions being confused, then the user is probably interested in this
    declareCuriosity(nodeName)
    // If the user mentions being confused, it means the user is not familiar with this
    declareUnfamiliar(nodeName)
    return
  }
  if (actionType == "alreadyFamiliar") {
    // the user knows about this and probably knows about the dependents
    declareFamiliar(nodeName)
    return
  }
}

function goToNode(nodeIndex, actionType) {
  var node = knowledgeGraph[nodeIndex]
  updateUserKnowledgeData(actionType)
  var nodeName = node["name"]
  console.log("goToNode '" + nodeName + "' actionType = " + actionType)
  nodeHistory.push(node)
  var name = node["name"]
  var description = node["description"]
  if (description == null)
    description = ""
  var dependencies = getDirectDependencyNames(nodeName)
  var soConfusedHelpNames = getSoConfusedHelpNames(nodeName)
  var dependents = getDirectDependentNames(nodeName)
  var alreadyFamiliarHelpNames = getAlreadyFamiliarHelpNames(nodeName)
  var render = ""
  render += makeHomeButton() + makeBackButton() + makeExplainSelfButton()
  render += "<h1>" + name + "</h1>"
  render += "<div>" + formatDescription(description) + "</div>"
  if (node == rootNode)
    render += makeSearchBox()

  render += "<div id=\"search-results\"></div>"
  linksInformation = []
  if (soConfusedHelpNames.length > 0) {
    linksInformation.push({"name":"I'm so confused.", "content":makeNodeList(soConfusedHelpNames, "confused")})
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
    linksInformation.push({"name":"I already knew this.", "content":makeNodeList(alreadyFamiliarHelpNames, "curious")})
  }
  render += makeTable(linksInformation)
  statusSections = []
  if (latestCuriosity != null) {
    statusSections.push("<h4>Curious about:</h4>" + latestCuriosity + "<br/>")
  }
  if (latestFamiliarity != null) {
    statusSections.push("<h4>Familiar with:</h4>" + latestFamiliarity + "<br/>")
  }
  if (statusSections.length > 0) {
    render += "<h3>Status:</h3>"
    for (var i = 0; i < statusSections.length; i++) {
      render += statusSections[i]
    }
  }

  render += makePermalinkAnchor(nodeName)

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

function explainSelf() {
  var name = "What is Jeff's Knowledge Graph?"
  var node = nodesByName[name]
  var index = node["index"]
  goToNode(index, "explainSelf")
}
