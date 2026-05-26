const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, '..', '..', 'src', 'services');
const CONTROLLERS_DIR = path.join(__dirname, '..', '..', 'src', 'controllers');

function getTsFiles(dirPath) {
  return fs
    .readdirSync(dirPath)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => path.join(dirPath, entry));
}

function extractExportedFunctions(content) {
  const exported = new Set();
  const functionPattern = /^\s*export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm;
  const constPattern = /^\s*export\s+const\s+([A-Za-z0-9_]+)\s*=/gm;

  let match = functionPattern.exec(content);
  while (match) {
    exported.add(match[1]);
    match = functionPattern.exec(content);
  }

  match = constPattern.exec(content);
  while (match) {
    exported.add(match[1]);
    match = constPattern.exec(content);
  }

  return [...exported];
}

function extractExportedControllers(content) {
  return extractExportedFunctions(content);
}

function buildControllerFileMap() {
  const map = new Map();
  getTsFiles(CONTROLLERS_DIR).forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    extractExportedControllers(content).forEach((controllerName) => {
      map.set(controllerName, filePath);
    });
  });
  return map;
}

function getActiveControllerFiles(manifest) {
  const controllerMap = buildControllerFileMap();
  const activeFiles = new Set();
  const unresolvedControllers = new Set();

  (manifest.endpoints || []).forEach((endpoint) => {
    if (!endpoint.controller) {
      return;
    }
    const filePath = controllerMap.get(endpoint.controller);
    if (filePath) {
      activeFiles.add(filePath);
    } else {
      unresolvedControllers.add(endpoint.controller);
    }
  });

  return {
    activeControllerFiles: [...activeFiles],
    unresolvedControllers: [...unresolvedControllers].sort(),
  };
}

function analyzeServiceCoverage(manifest) {
  const { activeControllerFiles, unresolvedControllers } = getActiveControllerFiles(manifest);
  const activeControllerContent = activeControllerFiles.map((filePath) =>
    fs.readFileSync(filePath, 'utf8')
  );

  const serviceCoverage = [];
  getTsFiles(SERVICES_DIR).forEach((serviceFile) => {
    const serviceContent = fs.readFileSync(serviceFile, 'utf8');
    const exportedFns = extractExportedFunctions(serviceContent);
    exportedFns.forEach((fnName) => {
      const regex = new RegExp(`\\b${fnName}\\b`);
      const referencedIn = activeControllerFiles
        .filter((_, index) => regex.test(activeControllerContent[index]))
        .map((filePath) => path.basename(filePath));

      serviceCoverage.push({
        serviceFile: path.basename(serviceFile),
        functionName: fnName,
        coveredByEndpointControllers: referencedIn.length > 0,
        referencedInControllers: referencedIn,
      });
    });
  });

  const covered = serviceCoverage.filter((entry) => entry.coveredByEndpointControllers).length;
  const uncovered = serviceCoverage.length - covered;

  return {
    totalExportedServiceFunctions: serviceCoverage.length,
    coveredByEndpointControllers: covered,
    uncoveredByEndpointControllers: uncovered,
    unresolvedControllers,
    serviceCoverage: serviceCoverage.sort((a, b) => {
      if (a.serviceFile === b.serviceFile) {
        return a.functionName.localeCompare(b.functionName);
      }
      return a.serviceFile.localeCompare(b.serviceFile);
    }),
  };
}

module.exports = {
  analyzeServiceCoverage,
};
