/* eslint-disable quote-props */
import path from 'path';
import program from 'commander';
import sh from 'shelljs';
import {version} from '../package.json';
import {spawn} from 'child_process';

let wasHandled = false;
let basePath = path.join(__dirname, '..');

const CONFIG = {
  react: {
    starter: 'react-web',
    configFiles: {
      'default.babelrc': '.babelrc',
      'default.eslintignore': '.eslintignore',
      'default.eslintrc': '.eslintrc',
      'default.flowconfig': '.flowconfig',
      'default.gitignore': '.gitignore',
      'flow-typed': '',
      'test': '',
      'webpack.config.js': '',
    },
    mkdir: ['.vscode', 'assets', 'src', 'node_modules'],
    seedFiles: {
      '.vscode/settings.json': '{\n  "javascript.validate.enable\": false\n}\n',
      'src/main.js': 'console.log(\'Hello World\');\n',
      'assets/index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>App</title>\n</head>\n<body>\n  <script src="/main.js"></script>\n</body>\n</html>\n',
    },
    packages: [
      // react
      'react', 'react-dom', 'class-autobind', 'classnames',
    ],
    devPackages: [
      // babel (with react)
      'babel-core', 'babel-preset-es2015-native-generators', 'babel-preset-react', 'babel-preset-stage-2', 'babel-plugin-transform-class-properties',
      // eslint (with react)
      'eslint', 'babel-eslint', 'eslint-plugin-babel', 'eslint-plugin-flowtype',
      'eslint-plugin-jest', 'eslint-config-react-app', 'eslint-plugin-import',
      'eslint-plugin-jsx-a11y', 'eslint-plugin-react',
      // flow
      'flow-bin', 'flow-typed',
      // webpack
      'webpack', 'webpack-cli', 'webpack-dev-server', 'babel-loader@7.x.x', 'css-loader', 'css-modules-require-hook', 'raw-loader', 'style-loader',
      // testing
      'jest@23.6.0', 'enzyme', 'enzyme-adapter-react-16', 'react-addons-test-utils',
      // code formatting
      'prettier-eslint', 'prettier-eslint-cli',
    ],
  },
  node: {
    starter: 'node',
    configFiles: {
      'default.babelrc': '.babelrc',
      'default.eslintignore': '.eslintignore',
      'default.eslintrc': '.eslintrc',
      'default.flowconfig': '.flowconfig',
      'default.gitignore': '.gitignore',
      'default.npmignore': '.npmignore',
      'default.prettierignore': '.prettierignore',
      'flow-typed': '',
    },
    mkdir: ['.vscode', 'lib', 'src', 'node_modules'],
    seedFiles: {
      '.vscode/settings.json': '{\n  "javascript.validate.enable\": false\n}\n',
      'src/main.js': 'console.log(\'Hello World\');\n',
    },
    packages: ['node-fetch'],
    devPackages: [
      // babel (without react)
      'babel-cli', 'babel-core', 'babel-preset-es2015-native-generators', 'babel-preset-stage-2', 'babel-plugin-transform-class-properties', 'babel-plugin-transform-flow-strip-types', 'babel-plugin-syntax-flow',
      // eslint (without react)
      'eslint', 'babel-eslint', 'eslint-plugin-babel', 'eslint-plugin-flowtype',
      'eslint-plugin-jest', 'eslint-config-react-app', 'eslint-plugin-import',
      'eslint-plugin-jsx-a11y', 'eslint-plugin-react',
      // flow
      'flow-bin', 'flow-typed',
      // testing
      'jest@23.6.0',
      // code formatting
      'prettier-eslint', 'prettier-eslint-cli',
    ],
  },
};

program
  .version(version, '-v,--version')
  .usage('init <project_name> [options]')
  .option('-t, --type [react|react-native|node]', 'Create a project of the given type.', 'react');

program.command('init <project_name>')
  .description('Create a directory with the given name and initialize an empty project.')
  .action((name) => {
    wasHandled = true;
    createProject(name, program.type);
  });

program.parse(process.argv);
if (!wasHandled) {
  program.help();
}

function createProject(name, type) {
  if (!CONFIG.hasOwnProperty(type)) {
    console.log(`Type "${type}" not yet supported.`);
    return;
  }
  let config = CONFIG[type];
  let {starter, configFiles, mkdir, seedFiles} = config;
  let starterPath = `${basePath}/starter/${starter}`;
  console.log(`Creating directory "${name}" ...`);
  sh.mkdir(name);
  sh.cd(name);
  console.log('Writing package.json ...');
  let pkgJSON = sh.cat(`${starterPath}/default-package.json`);
  let pkg = JSON.parse(pkgJSON);
  pkg.name = name;
  pkg.description = name;
  sh.ShellString(JSON.stringify(pkg, null, 2)).to('./package.json');
  console.log('Copying config files ...');
  for (let srcFile of Object.keys(configFiles)) {
    let dstFile = configFiles[srcFile];
    sh.cp('-R', `${starterPath}/${srcFile}`, `./${dstFile}`);
  }
  console.log('Creating directories ...');
  if (mkdir && mkdir.length) {
    sh.mkdir(...mkdir);
  }
  for (let fileName of Object.keys(seedFiles)) {
    let content = seedFiles[fileName];
    sh.ShellString(content).to(`./${fileName}`);
  }
  console.log('Installing packages ...');
  installPackages(config.packages, false, () => {
    console.log('Installing dev packages ...');
    installPackages(config.devPackages, true, () => {
      console.log('Installing Flow type declarations ...');
      installFlowTypes(name, () => {
        console.log('Project created successfully.');
      });
    });
  });
}

function installPackages(packages, isDev, callback) {
  if (packages.length === 0) {
    callback();
    return;
  }
  let args = ['add'];
  if (isDev) {
    args.push('--dev');
  }
  args = args.concat(packages);
  let child = spawn(binPath('yarn'), args, {cwd: process.cwd(), stdio: 'inherit'});
  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`yarn exited with code ${code}`);
      process.exit();
    } else {
      callback();
    }
  });
}

function installFlowTypes(projectName, callback) {
  let args = ['install'];
  let child = spawn(binPath('flow-typed'), args, {cwd: process.cwd(), stdio: 'inherit'});
  child.on('close', (code) => {
    if (code !== 0) {
      console.log(`flow-typed exited with code ${code}`);
      process.exit();
    } else {
      callback();
    }
  });
}

function binPath(name) {
  return path.join(__dirname, '../node_modules/.bin', name);
}
