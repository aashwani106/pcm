const path = require('node:path');

module.exports = function (api) {
  api.cache(true);

  const appRoot = path.resolve(__dirname, 'app');

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      function inlineExpoRouterEnvVars({ types: t }) {
        return {
          name: 'inline-expo-router-env-vars',
          visitor: {
            MemberExpression(memberPath, state) {
              const object = memberPath.node.object;
              if (!t.isMemberExpression(object)) return;
              if (!t.isIdentifier(object.object, { name: 'process' })) return;
              if (!t.isIdentifier(object.property, { name: 'env' })) return;

              const keyNode = memberPath.toComputedKey();
              if (!t.isStringLiteral(keyNode)) return;

              if (keyNode.value === 'EXPO_ROUTER_IMPORT_MODE') {
                memberPath.replaceWith(t.stringLiteral('sync'));
                return;
              }

              if (keyNode.value !== 'EXPO_ROUTER_APP_ROOT') return;

              const filename = state.file.opts.filename;
              if (!filename) return;

              const relativeRoot = path.relative(path.dirname(filename), appRoot);
              memberPath.replaceWith(t.stringLiteral(relativeRoot));
            },
          },
        };
      },
      'react-native-worklets/plugin',
    ],
  };
};
