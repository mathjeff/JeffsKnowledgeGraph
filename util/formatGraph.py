#!python
import json, os, shutil

pathOfThisFile = __file__
os.chdir(os.path.join(os.path.dirname(pathOfThisFile), ".."))

class KnowledgeGraph():
  def __init__(self):
    self.nodesByName = {}

  def addNode(self, newNode):
    name = newNode.name
    #print("Adding node named " + name)
    existingNode = self.nodesByName.get(name)
    if existingNode is not None:
      raise Exception("Duplicate node name '" + str(name) + "'")
    self.nodesByName[name] = newNode

  def validate(self):
    self.validateDependenciesExist()
    self.validateNoCycles()

  def validateDependenciesExist(self):
    for node in self.nodesByName.values():
      for dependencyName in node.dependencyNames:
        if dependencyName not in self.nodesByName:
          raise Exception("In " + str(node.sourceFile) + ",\n  Node '" + str(node.name) + "'\n  declares dependency '" + str(dependencyName) + "'\n  which is not found")

  def validateNoCycles(self):
    # copy nodes by name
    nodesToCheck = {}
    for name in self.nodesByName.keys():
      nodesToCheck[name] = self.nodesByName[name]

    # Repeatedly find each node with having no dependencies referring to another node within the set, and remove that node
    # If no such nodes are found, there's at least one cycle
    while len(nodesToCheck) > 0:
      newNodesToCheck = {}
      for node in nodesToCheck.values():
        hasDependency = False
        for dependencyName in node.dependencyNames:
          if dependencyName in nodesToCheck:
            hasDependency = True
            break
        if hasDependency:
          newNodesToCheck[node.name] = node
      if len(newNodesToCheck) >= len(nodesToCheck):
        raise Exception("Found cycle among these nodes: " + str(list(newNodesToCheck.keys())))
      nodesToCheck = newNodesToCheck


  def writeToPath(self, path):
    entries = [node.toDict() for node in self.nodesByName.values()]
    with open(path, 'w') as file:
      file.write("knowledgeGraph=")
      json.dump(entries, file)

class KnowledgeNode():
  def __init__(self, name, description, sourceFile, dependencyNames):
    self.name = name
    self.description = description
    self.sourceFile = sourceFile
    self.dependencyNames = dependencyNames


  def toDict(self):
    return {"name": self.name, "description": self.description, "dependencies": self.dependencyNames}

def findKnowledgeFiles(rootPath):
  result = []
  for rootPath, directories, files in os.walk(rootPath):
    for file in files:
      if file.endswith(".txt"):
        result.append(os.path.join(rootPath, file))
  return sorted(result)

def parseKnowledgeFiles(files):
  graph = KnowledgeGraph()
  for file in files:
    addKnowledgeFile(file, graph)
  graph.validate()
  return graph

def addKnowledgeFile(filePath, graph):
  title = None
  description = None
  dependencies = []
  with open(filePath) as file:
    for line in file:
      line = line.rstrip()
      if line.startswith("#"):
        # Comment - ignore
        continue
      childPrefix = "  "
      if not line.startswith(childPrefix) and len(line) > 0:
        # Title
        newTitle = line
        if title is not None:
          # add previous node
          graph.addNode(KnowledgeNode(title, description, filePath, dependencies))
          # clear existing information
          title = None
          description = None
          dependencies = []
        # update title
        title = newTitle
        continue
      content = line[len(childPrefix):]
      dependencyPrefix = "- "
      if content.startswith(dependencyPrefix):
        dependency = content[len(dependencyPrefix):]
        dependencies.append(dependency)
        continue
      # Description
      if len(content) > 0 or description is not None:
        if description is None:
          description = ""
        else:
          description += "\n"
        description += content
  # also add the last node
  graph.addNode(KnowledgeNode(title, description, filePath, dependencies))

def main():
  print("building in " + str(os.getcwd()))
  files = findKnowledgeFiles("content")
  print("Processing " + str(len(files)) + " files: " + str(files))
  graph = parseKnowledgeFiles(files)
  destPath = "out/site/knowledge.json.js"
  graph.writeToPath(destPath)
  print("Wrote knowledge graph to " + destPath)
  print("done")

if __name__ == "__main__":
  main()
