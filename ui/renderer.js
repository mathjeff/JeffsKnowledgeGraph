function setupInterface() {
  console.log("setting up interface")

  analyzeGraph()
  resetFamiliarity()
  loadPersistentData()

  enableBackButton()
  goToInitialNode()
  console.log("done setting up interface")
}

function analyzeGraph() {
  makeRootNode()
  detectTopics()
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
  numFamiliarNodes = 0
  // names of nodes that the user has already visited
  visitedNodes = new Set()
}

function numberNodes() {
  for (i = 0; i < knowledgeGraph.length; i++) {
    knowledgeGraph[i]["index"] = i
  }
}

function getParentTopicName(topicName) {
  if (topicName.indexOf("/") >= 0)
    return topicName.replace(/\/[^/]*$/, "")
  return rootNode["name"]
}

function detectTopics() {
  var rootName = rootNode["name"]
  var topicsByName = {}
  topicsByName[rootName] = rootNode
  var initialNumNodes = knowledgeGraph.length
  for (var i = 0; i < knowledgeGraph.length; i++) {
    var topicName = knowledgeGraph[i]["topic"]
    if (topicName) {
      if (!(topicName in topicsByName)) {
        var parentName = getParentTopicName(topicName)
        if (parentName != topicName) {
          var isChildTopic = (i >= initialNumNodes)
          var isParentDir = isChildTopic
          var topic = {"name": topicName, "dependencies":[], "subtopics":[], "topic": parentName, "fromDir":isParentDir}
          topicsByName[topicName] = topic
          knowledgeGraph.push(topic)
        }
      }
    }
  }
  for (var i = 0; i < knowledgeGraph.length; i++) {
    var node = knowledgeGraph[i]
    if (node != rootNode) {
      var topicName = node["topic"]
      var topic = topicsByName[topicName]
      topic["subtopics"].push(node["name"])
    }
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
  rootNode = {"name":"Welcome to Jeff's Knowledge Graph", "description":"", dependencies:[], "topic":null, "subtopics": []}
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
    }
  }
}

function getDirectDependencyNames(nodeName) {
  var node = nodesByName[nodeName]
  return node["dependencies"]
}

function getDirectSubtopicNames(nodeName) {
  var node = nodesByName[nodeName]
  var subtopics = node["subtopics"]
  if (!subtopics)
    subtopics = [] // this node might not be a topic
  return subtopics
}

// Tells whether this node has any child nodes
function hasSubtopics(nodeName) {
  return getDirectSubtopicNames(nodeName).length > 0
}

// Returns a list of names of nodes that are descendants of this node or are this node
// For a leaf node, should return a list with just its own name
function getAllSubtopicNames(nodeName) {
  var resultList = []
  var resultSet = new Set()
  resultList.push(nodeName)
  resultSet.add(nodeName)
  for (var i = 0; i < resultList.length; i++) {
    var topic = resultList[i]
    var children = getDirectSubtopicNames(topic)
    for (var j = 0; j < children.length; j++) {
      var child = children[j]
      if (!(child in resultSet)) {
        resultList.push(child)
        resultSet.add(child)
      }
    }
  }
  // remove the first item
  return resultList
}

// Returns the number of leaf nodes that have this node as an ancestor or are this node
// Should always return at least 1
function getNumLeafTopicNames(nodeName) {
  var allSubtopics = getAllSubtopicNames(nodeName)
  var numSubtopics = 0
  for (var i = 0; i < allSubtopics.length; i++) {
    var subtopic = allSubtopics[i]
    if (!hasSubtopics(subtopic)) {
      numSubtopics++
    }
  }
  return numSubtopics
}

function getNumUnfamiliarLeafTopics(nodeName) {
  var allSubtopics = getAllSubtopicNames(nodeName)
  var numNewSubtopics = 0
  for (var i = 0; i < allSubtopics.length; i++) {
    var subtopic = allSubtopics[i]
    if (!hasSubtopics(subtopic) && getFamiliarityByName(allSubtopics[i]) != true) {
      numNewSubtopics++
    }
  }
  return numNewSubtopics
}

function hasUnfamiliarLeafTopic(nodeName) {
  return getNumUnfamiliarLeafTopics(nodeName) > 0
}

function getFamiliarityByName(name) {
  return familiarityByName[name]
}

// make a guess about how to help a user that is very confused
function getSoConfusedHelpNames(nodeName) {
  // find everything that the user will need to know to learn this topic
  var candidates = getUnfamiliarDependencies(nodeName)

  var fullCount = countNumUnfamiliarDependencies(nodeName)
  var targetCount = fullCount / 2

  // count number of unfamiliar dependencies for each one
  var bestResult = null
  var bestScore = -100000
  for (var candidate of candidates) {
    var count = countNumUnfamiliarDependencies(candidate)
    if (count < targetCount) {
      var score = -Math.abs(count - targetCount)
      if (bestResult == null || score >= bestScore) {
        bestResult = candidate
        bestScore = score
      }
    }
  }

  if (bestResult == null) {
    return []
  }
  return [bestResult]
}

function getUnfamiliarDependencies(nodeName) {
  // find everything that the user will need to know to learn this topic
  var allDependencies = getAllDependenciesOf(nodeName)
  return removeFamiliarDependencies(allDependencies)
}

function removeFamiliarDependencies(allDependencies) {
  var result = []
  for (var candidate of allDependencies) {
    var count = countNumUnfamiliarDependencies(candidate)
    console.log("num unfamiliar dependencies of " + candidate + " is " + count)
    if (count > 0) {
      result.push(candidate)
    }
  }

  return result
}

function shouldShowNodeInDependencyGraph(node, isRootOfGraph, moreComplicatedFirst) {
  if (node["description"] != null && node["description"] != "") {
    // If the node has a description, the node should be shown
    return true
  }
  if (isRootOfGraph && moreComplicatedFirst) {
    // When the user is viewing a graph:
    //   We show the root node even when its description is empty so the user can remember what they're looking at
    //   We don't show other nodes having empty descriptions because their purposes should already be clear
    // When the user is not viewing the graph:
    //   We don't have any good ideas about where to put the title of the root node, so for now we don't include it anyhere
    return true
  }
  return false
}

function computeIndentations(candidates) {
  var indentations = {}
  var firstCandidateName = candidates[candidates.length - 1]
  indentations[firstCandidateName] = 0
  for (var i = candidates.length - 1; i >= 0; i--) {
    var candidateName = candidates[i]
    var currentIndentation = indentations[candidateName]
    var dependencyNames = getDirectDependencyNames(candidateName)
    var nextIndentation = 0
    var candidateIsRoot = (candidateName == firstCandidateName)
    if (shouldShowNodeInDependencyGraph(getNodeByName(candidateName), candidateIsRoot, true))
      nextIndentation = currentIndentation + 1
    else
      nextIndentation = currentIndentation
    for (dependencyName of dependencyNames) {
      if ((!(dependencyName in indentations)) || indentations[dependencyName] > nextIndentation)
        indentations[dependencyName] = nextIndentation
    }
  }
  return indentations
}

function expandDependencies(includeFamiliar, moreComplicatedFirst, shouldIndent) {
  var currentNode = getCurrentNode()
  var nodeName = currentNode["name"]
  var order = ""
  var candidates = getAllDependenciesOf(nodeName)
  var indentations = computeIndentations(candidates)
  if (!includeFamiliar)
    candidates = removeFamiliarDependencies(candidates)
  var html = ""
  console.log("expanding dependencies of " + nodeName)
  if (moreComplicatedFirst && shouldIndent)
    candidates = getAllDependenciesInTreeOrderOf(nodeName, indentations)
  for (var i = 0; i < candidates.length; i++) {
    var candidateName = candidates[i]
    var candidate = getNodeByName(candidateName)
    var candidateIsRoot = (candidateName == nodeName)
    if (shouldShowNodeInDependencyGraph(candidate, candidateIsRoot, moreComplicatedFirst)) {
      var nodeText = formatNodeText(candidate)
      var indentation = indentations[candidateName]
      var margin = 0
      if (shouldIndent)
        margin = indentation * 40
      var newDiv = "<div style='margin-left:" + margin + "px'>" + nodeText + "</div>"
      html += newDiv
    }
  }
  document.getElementById("text").innerHTML = html
}

function expandUnfamiliarDependenciesList() {
  expandDependencies(false, false, false)
}

function expandUnfamiliarDependenciesOutline() {
  expandDependencies(false, true, true)
}

function expandAllDependenciesList() {
  expandDependencies(true, false, false)
}

function expandAllDependenciesOutline() {
  expandDependencies(true, true, true)
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

function clearFamiliarity() {
  var familiarNames = familiarityByName
  console.log(familiarNames)
  for (var key in familiarNames) {
    declareFamiliarity(key, null)
  }
  latestFamiliarity = null
  goHome()
}

function requestClearFamiliarity() {
  var warning = "Are you sure that you want to declare that you are unfamiliar with all of the information here?" + "<br/>"
  warning += "<br/>"
  warning += "This means you may have to reread " + numFamiliarNodes + " entries."
  var homeButton = makeHomeButton()
  var helpButton = makeExplainSelfButton()
  var clearButton = makeClearFamiliarityButton()

  var newContent = warning + "<br/>" + homeButton + helpButton + clearButton
  document.getElementById("content").innerHTML = newContent
}

// Declares that the user is familiar with this node
function declareFamiliarity(nodeName, isFamiliar) {
  if (familiarityByName[nodeName] == isFamiliar) {
    // already knew this
    return
  }

  console.log("declaring familiarity with " + nodeName + " = " + isFamiliar)
  var subtopics = getDirectSubtopicNames(nodeName)
  if (subtopics.length > 0) {
    // declaring familiarity with a topic really means declaring familiarity with everything in it
    for (var i = 0; i < subtopics.length; i++) {
      declareFamiliarity(subtopics[i], isFamiliar)
    }
    return
  }

  var wasFamiliar = familiarityByName[nodeName] == true

  familiarityByName[nodeName] = isFamiliar
  if (isFamiliar) {
    numFamiliarNodes++
  } else {
    if (wasFamiliar)
      numFamiliarNodes--
  }
  savePersistentValue("familiar." + nodeName, isFamiliar)
  if (isFamiliar) {
    // also declare familiarity with dependencies
    var dependencies = getDirectDependencyNames(nodeName)
    for (var i = 0; i < dependencies.length; i++) {
      declareFamiliarity(dependencies[i], isFamiliar)
    }
  }
  if (isFamiliar)
    latestFamiliarity = nodeName
}

function hasTransitiveDependency(nodeName, candidateDependency) {
  var dependencies = getAllDependenciesSetOf(nodeName)
  return dependencies.has(candidateDependency)
}

function getAllDependenciesSetOf(nodeName) {
  var allDependenciesSet = new Set()
  var allDependenciesList = []
  addDependenciesRecursivelyTo(nodeName, allDependenciesList, allDependenciesSet)
  return allDependenciesSet
}

// Transitively gets all dependencies of the given node, in the given order
//   list: In this order, each node will be later in the list than any of its dependencies
//         This is convenient for reading items in a list form
function getAllDependenciesOf(nodeName, order = "list") {
  console.log("getting all dependencies of '" + nodeName + "' in " + order + " order")
  var allDependenciesSet = new Set()
  var allDependenciesList = []
  addDependenciesRecursivelyTo(nodeName, allDependenciesList, allDependenciesSet, order)
  return allDependenciesList
}

function addDependenciesRecursivelyTo(newDependency, destinationList, destinationSet, order = "list") {
  if (destinationSet.has(newDependency))
    return
  destinationSet.add(newDependency)
  var newDependencies = getDirectDependencyNames(newDependency)
  for (var dependency of newDependencies) {
    addDependenciesRecursivelyTo(dependency, destinationList, destinationSet, order)
  }
  destinationList.push(newDependency)
}

// Transitively gets all dependencies of the given node, in the given order
//   tree: In this order, each node will be after one dependent but before other dependents
//         Also, each child will be sorted by decreasing indent
//         This is convenient for reading items in a tree form
function getAllDependenciesInTreeOrderOf(nodeName, indentations) {
  console.log("getting all dependencies of '" + nodeName + "' in tree order")
  var allDependenciesSet = new Set()
  var allDependenciesList = []
  addDependenciesRecursivelyInTreeOrderTo(nodeName, allDependenciesList, allDependenciesSet, indentations)
  return allDependenciesList
}

function addDependenciesRecursivelyInTreeOrderTo(newDependency, destinationList, destinationSet, indentations) {
  if (destinationSet.has(newDependency))
    return
  destinationSet.add(newDependency)
  destinationList.push(newDependency)
  var newDependencies = getDirectDependencyNames(newDependency)
  // process dependencies from maximum indent to minimum indent, in case an ancestor node decreased the indent of one of our children
  var dependenciesByIndent = []
  for (var dependency of newDependencies) {
    var indent = indentations[dependency]
    if (!(indent >= 0))
      indent = 0
    while (dependenciesByIndent.length <= indent) {
      dependenciesByIndent.push([])
    }
    dependenciesByIndent[indent].push(dependency)
  }
  for (var i = dependenciesByIndent.length - 1; i >= 0; i--) {
    var dependenciesHere = dependenciesByIndent[i]
    for (var dependency of dependenciesHere) {
      addDependenciesRecursivelyInTreeOrderTo(dependency, destinationList, destinationSet, indentations)
    }
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
    var familiarity = familiarityByName[dependency]
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

function hasNodeWithName(name) {
  return name in nodesByName
}

function makeGoToButton(nodeName, actionType) {
  var node = nodesByName[nodeName]
  var nodeIndex = node["index"]
  var goText = "goToNode(" + nodeIndex + ", \"" + actionType + "\")"
  var actionClass = "button-" + actionType
  var buttonText = nodeName
  if (buttonText == rootNode["name"])
    buttonText = "Welcome" // This is shorter
  return "<button class='knowledge-button " + actionClass + "' onclick='" + goText + "'>" + buttonText + "</button>"
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

function makeListUnfamiliarDependenciesButton(numDependencies) {
  return "<button class='knowledge-button button-expand' onclick='expandUnfamiliarDependenciesList()'>List " + numDependencies + " unfamiliar dependencies</button>"
}

function makeOutlineUnfamiliarDependenciesButton(numDependencies) {
  return "<button class='knowledge-button button-expand' onclick='expandUnfamiliarDependenciesOutline()'>Outline " + numDependencies + " unfamiliar dependencies</button>"
}

function makeListAllDependenciesButton(numDependencies) {
  return "<button class='knowledge-button button-expand' onclick='expandAllDependenciesList()'>List all " + numDependencies + " dependencies</button>"
}

function makeOutlineAllDependenciesButton(numDependencies) {
  return "<button class='knowledge-button button-expand' onclick='expandAllDependenciesOutline()'>Outline all " + numDependencies + " dependencies</button>"
}

function makeRequestClearFamiliarityButton() {
  return "<button class='knowledge-button button-request-clear-familiarity' onclick='requestClearFamiliarity()'>Clear Familiarity</button>"
}

function makeClearFamiliarityButton() {
  return "<button class='knowledge-button button-clear-familiarity' onclick='clearFamiliarity()'>Clear Familiarity</button>"
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

function stringScore(queryWords, nodeText) {
  var numMatchingWords = 0
  var numWords = 0
  if (nodeText == null || nodeText == "")
    return 0;
  for (var queryWord of queryWords) {
    if (nodeText.includes(queryWord)) {
      numMatchingWords += 1
    }
  }
  return numMatchingWords / Math.max(1, queryWords.length)
}

function getMatchScore(queryText, node) {
  var score = 0
  var queryWords = queryText.toUpperCase().split(" ")
  var nodeName = node["name"].toUpperCase()
  var nodeDescription = node["description"]
  if (nodeDescription != null)
    nodeDescription = nodeDescription.toUpperCase()

  // prioritize matching words in the title
  score += 2 * stringScore(queryWords, nodeName)
  // give some value to matching words in the description
  score += stringScore(queryWords, nodeDescription)
  if (score > 0) {
    // prefer shorter names
    score += 0.5 / node["name"].length
  }
  return score
}

function findQueryResults(queryText, currentNodeName) {
  var subtopics = getAllSubtopicNames(currentNodeName)
  // find the best few matches
  matches = []
  targetNumMatches = 5
  for (i = 0; i < subtopics.length; i++) {
    var node = getNodeByName(subtopics[i])
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

function makeOpenIssueLink() {
    return "<a href='https://github.com/mathjeff/JeffsKnowledgeGraph/issues/new'>Open an issue</a>"
}

function runQuery(queryText) {
  var currentNode = getCurrentNode()
  var queryResults = findQueryResults(queryText, currentNode["name"])
  if (queryResults.length > 0) {
    html = makeNodeList(queryResults, "searchResult")
  } else {
    var whereText = ""
    if (currentNode != rootNode) {
      whereText = " under " + currentNode["name"]
    }
    html = "No results found" + whereText + ". " + makeOpenIssueLink()
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

function makeSearchBox(nodeName, numEntries) {
  labelHtml = "<div>Search (" + numEntries + " entries):</div>"
  inputHtml = '<input type="text" id="query" onkeypress="queryBoxKeyPress(event)">'
  return labelHtml + inputHtml
}

function compareNodePriorities(nodeName1, nodeName2) {
  // nodes that the user hasn't already seen are more interesting
  var visited1 = (visitedNodes.has(nodeName1))
  var visited2 = (visitedNodes.has(nodeName2))
  if (visited1 != visited2) {
    if (visited1)
      return 1
    return -1
  }

  // nodes that the user has expressed interest in are more important
  var curious1 = nodeName1 in curiousDependencyNames
  var curious2 = nodeName2 in curiousDependencyNames
  if (curious1 != curious2) {
    if (curious1)
      return -1
    return 1
  }

  // nodes that the user are slightly unfamiliar with are ideal
  var numUnfamiliarDependencies1 = countNumUnfamiliarDependencies(nodeName1)
  if (numUnfamiliarDependencies1 <= 0)
    numUnfamiliarDependencies1 = 2000000
  // a node that has subtopics is worse than something new but better than something old
  if (getDirectSubtopicNames(nodeName1).length > 0)
    numUnfamiliarDependencies1 = 1000000
  var numUnfamiliarDependencies2 = countNumUnfamiliarDependencies(nodeName2)
  if (numUnfamiliarDependencies2 <= 0)
    numUnfamiliarDependencies2 = 2000000
  if (getDirectSubtopicNames(nodeName2).length > 0)
    numUnfamiliarDependencies2 = 1000000
  if (numUnfamiliarDependencies1 != numUnfamiliarDependencies2) {
    if (numUnfamiliarDependencies1 < numUnfamiliarDependencies2)
      return -1
    return 1
  }

  // help-related nodes are more important
  var knowledge1 = nodeName1.indexOf("Knowledge") >= 0
  var knowledge2 = nodeName2.indexOf("Knowledge") >= 0
  if (knowledge1 != knowledge2) {
    if (knowledge1)
      return -1
    return 1
  }

  return 0
}

function orderNodeNames(nodeNames) {
  var sorted = Array.from(nodeNames)
  sorted.sort(compareNodePriorities)
  return sorted
}

function makeNodeList(nodeNames, actionType) {
  var nodeNames = orderNodeNames(nodeNames)

  var alreadyVisitedNames = []
  var unvisitedNames = []
  for (var i = 0; i < nodeNames.length; i++) {
    var nodeName = nodeNames[i]
    if (visitedNodes.has(nodeName)) {
      alreadyVisitedNames.push(nodeName)
    } else {
      unvisitedNames.push(nodeName)
    }
  }

  var alreadyFamiliarNames = []
  var unfamiliarNames = []
  for (var i = 0; i < unvisitedNames.length; i++) {
    var nodeName = unvisitedNames[i]
    if (hasUnfamiliarLeafTopic(nodeName)) {
      unfamiliarNames.push(nodeName)
    } else {
      alreadyFamiliarNames.push(nodeName)
    }
  }

  var result = ""
  var unfamiliarButtons = makeUnlabelledNodeList(unfamiliarNames, actionType)
  var familiarButtons = makeUnlabelledNodeList(alreadyFamiliarNames, actionType)
  if (unfamiliarNames.length > 0 && alreadyFamiliarNames.length > 0) {
    result += "<div>New:</div>" + unfamiliarButtons
    result += "<div>Familiar:</div>" + familiarButtons
  } else {
    result += unfamiliarButtons + familiarButtons
  }

  if (unvisitedNames.length > 0 && alreadyVisitedNames.length > 0) {
    result += "<div>Visited:</div>"
  }
  var visitedButtons = makeUnlabelledNodeList(alreadyVisitedNames, actionType)
  result += visitedButtons
  return result
}

function makeUnlabelledNodeList(nodeNames, actionType) {
  var nodeNames = orderNodeNames(nodeNames)
  var html = ""
  for (var i = 0; i < nodeNames.length; i++) {
    dependency = nodeNames[i]
    html += makeGoToButton(dependency, actionType) + "<br/>"
  }
  return html
}

function formatDescription(descriptionText) {
  return marked.parse(descriptionText)
}

function formatNodeText(node) {
  var description = node["description"]
  if (description == null)
    description = ""
  return "<h1>" + node["name"] + "</h1>" +"<div>" + formatDescription(description) + "</div>"
}

function makeTable(columns) {
  result = ""
  result += "<table>"
  result += "<tr>"
  // If there is only one column then we don't need to explain it ("Tell me about:") because it's already explained by the "Explore" above
  var outputColumnHeaders = (columns.length > 1)
  if (outputColumnHeaders) {
    for (i = 0; i < columns.length; i++) {
      column = columns[i]
      result += "<th>" + column["name"] + "</th>"
    }
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

// returns the url of the source code at the given relative file path
function getSourceLink(relativePath) {
  return "https://github.com/mathjeff/JeffsKnowledgeGraph/blob/main/" + relativePath
}

function makeEditLink(node) {
  var topicName = null;
  if (hasSubtopics(node["name"])) {
    // A topic is stored in its own file
    topicName = node["name"]
  } else {
    // A non-topic node is stored in a file with its topic
    topicName = node["topic"]
  }
  var filepath = null

  if (node["fromDir"]) {
    filepath = topicName
  } else {
    filepath = topicName + ".txt"
  }
  var sourceLink = getSourceLink("content/" + filepath)
  return '<a href="' + sourceLink + '">Edit</a>'
}

function getCurrentNode() {
  return nodeHistory[nodeHistory.length - 1]
}

// updates our information about what the user knows and is interested in
function updateUserKnowledgeData(actionType) {
  if (nodeHistory.length < 1)
    return // the user hasn't visited any nodes yet
  currentNode = getCurrentNode()
  var nodeName = currentNode["name"]
  if (actionType == "elaborate") {
    // If the user is curious about more details, then the user is familiar with the existing information
    declareFamiliarity(nodeName, true)
    return
  }
  if (actionType == "confused") {
    // If the user mentions being confused, then the user is probably interested in this
    declareCuriosity(nodeName)
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
  var node = knowledgeGraph[nodeIndex]
  updateUserKnowledgeData(actionType)
  var nodeName = node["name"]
  console.log("goToNode '" + nodeName + "' actionType = " + actionType)

  if (actionType != "back") {
    // keep track of this node
    nodeHistory.push(node)
    // Also inform the browser that when pressing the back button we undo this visit
    history.pushState({}, "")
  }

  visitedNodes.add(nodeName)
  var name = node["name"]
  var description = node["description"]
  if (description == null)
    description = ""
  var dependencies = getDirectDependencyNames(nodeName)
  var subtopics = getDirectSubtopicNames(nodeName)
  var topicName = node["topic"]
  var containingTopics = []
  if (topicName)
    containingTopics.push(topicName)
  //console.log("subtopics of '" + nodeName + "' = " + subtopics)
  var soConfusedHelpNames = getSoConfusedHelpNames(nodeName)
  var dependents = getDirectDependentNames(nodeName)
  var alreadyFamiliarHelpNames = getAlreadyFamiliarHelpNames(nodeName)
  var render = ""
  render += makeHomeButton() + makeBackButton() + makeExplainSelfButton() + makeRequestClearFamiliarityButton()
  render += "<div id='text'>"
  render +=   formatNodeText(node)
  render += "</div>"
  if (subtopics.length > 0) {
    var numSubtopics = getNumLeafTopicNames(nodeName)
    var numNewSubtopics = getNumUnfamiliarLeafTopics(nodeName)
    render += makeSearchBox(nodeName, numSubtopics)
    render += "<br/>"
    render += "Explore (" + numNewSubtopics + " new):"
  }

  render += "<div id=\"search-results\"></div>"
  linksInformation = []
  var allDependencies = getAllDependenciesOf(nodeName)
  if (soConfusedHelpNames.length > 0 || allDependencies.length >= 3) {
    var confusedNodes = makeNodeList(soConfusedHelpNames, "confused")
    var unfamiliarDependencies = removeFamiliarDependencies(allDependencies)
    var expansionNodes = []
    var numDependencies = allDependencies.length - 1 // exclude self from the count
    var numUnfamiliarDependencies = unfamiliarDependencies.length - 1 // exclude self from the count
    if (numUnfamiliarDependencies >= 2) {
      // exclude self from the count so subtract 1 from the count
      expansionNodes.push(makeListUnfamiliarDependenciesButton(numUnfamiliarDependencies))
      expansionNodes.push(makeOutlineUnfamiliarDependenciesButton(numUnfamiliarDependencies))
    }
    if (numDependencies > numUnfamiliarDependencies && numDependencies >= 2) {
      expansionNodes.push(makeListAllDependenciesButton(numDependencies))
      expansionNodes.push(makeOutlineAllDependenciesButton(numDependencies))
    }
    var expansionText = ""
    for (var i = 0; i < expansionNodes.length; i++) {
      if (i > 0)
        expansionText = expansionText + "<br/>"
      expansionText = expansionText + expansionNodes[i]
    }

    linksInformation.push({"name":"I'm so confused.", "content": confusedNodes + expansionText})
  }

  if (dependencies.length > 0) {
    if (description == "")
      dependenciesTitle = "Things to learn:"
    else
      dependenciesTitle = "What?"
    linksInformation.push({"name":dependenciesTitle, "content": makeNodeList(dependencies, "confused")})
  }
  if (containingTopics.length > 0) {
    linksInformation.push({"name":"Nevermind.", "content": makeNodeList(containingTopics, "broadenTopic")})
  }
  if (subtopics.length > 0) {
    linksInformation.push({"name": "Tell me about:", "content": makeNodeList(subtopics, "narrowTopic")})
  }
  var seeMoreNodes = dependents.concat(containingTopics)
  if (seeMoreNodes.length > 0) {
    linksInformation.push({"name":"Got it. What's next?", "content": makeNodeList(seeMoreNodes, "elaborate")})
  }
  if (alreadyFamiliarHelpNames.length > 0) {
    // Give the user a chance to say that they already knew this, unless this is a topic
    if (subtopics.length <= 0) {
      linksInformation.push({"name":"I already knew the above.", "content": makeNodeList(alreadyFamiliarHelpNames, "elaborate")})
    }
  }
  if (node != rootNode) {
    // The root page is completely autogenerated, so we don't add an edit link to it at the moment
    var editNodes = makeEditLink(node) + "<br/>" + makeOpenIssueLink()
    linksInformation.push({"name":"Let's improve this!", "content":editNodes})
  }

  render += makeTable(linksInformation)
  statusSections = []
  if (latestCuriosity != null) {
    statusSections.push("<h4>Curious about:</h4>" + latestCuriosity + "<br/>")
  }
  if (latestFamiliarity != null) {
    statusSections.push("<h4>Familiar with " + numFamiliarNodes + " entries, including:</h4>" + latestFamiliarity + "<br/>")
  }
  if (statusSections.length > 0) {
    render += "<h3>My Status:</h3>"
    for (var i = 0; i < statusSections.length; i++) {
      render += statusSections[i]
    }
  }

  render += makePermalinkAnchor(nodeName) + "<br/>"

  document.getElementById("content").innerHTML = "<div>" + render + "</div>"
}

function goHome() {
  goToNode(rootNode["index"], "home")
}

// calling this function causes the back button to go back to our previous node if we have one, or otherwise go back to the previous website
function enableBackButton() {
  window.onpopstate = function() {
    if (!goBack()) {
      history.back()
    }
  }
}

// goes back to the previous node and returns true if it had another node to go to
function goBack() {
  if (nodeHistory.length >= 2) {
    // identify the previous node
    previousNode = nodeHistory[nodeHistory.length - 2]
    // remove the current node from the history
    nodeHistory.pop()
    // jump to the previous node
    goToNode(previousNode["index"], "back")
    return true
  } else {
    return false
  }
}

function explainSelf() {
  var name = "What is Jeff's Knowledge Graph?"
  var node = nodesByName[name]
  var index = node["index"]
  goToNode(index, "explainSelf")
}

// loads and interprets cookies
function loadPersistentData() {
  var persistentValues = getPersistentValues()
  var count = persistentValues.length;
  var familiarityMarker = "familiar."
  for (var i = count - 1; i >= 0; i--) {
    var key = persistentValues.key(i)
    var value = persistentValues.getItem(key)
    if (value != null) {
      if (key.startsWith(familiarityMarker)) {
        var topicName = key.substring(familiarityMarker.length)
        if (value == "true")
          value = true
        else
          value = false
        if (hasNodeWithName(topicName)) {
          declareFamiliarity(topicName, value)
        } else {
          console.log("Removing familiarity for no longer existent topic '" + topicName + "'")
          persistentValues.removeItem(key)
        }
      }
    }
  }
}

function getPersistentValues() {
  return localStorage
}

function savePersistentValue(key, value) {
  var values = getPersistentValues()
  if (value == null) {
    values.removeItem(key)
  } else {
    values.setItem(key, value)
  }
}
