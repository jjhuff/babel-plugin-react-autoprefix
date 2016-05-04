import autoprefix from 'autoprefix';

const isFunction = value => typeof value === 'function';
const isString = value => typeof value === 'string';
const isStyle = node => node.name.name === 'style';

function propertiesToObject(t, props) {
  const keyedProps = {};

  function handleSpreadProperty(node) {
    if (typeof node.properties === 'undefined') return;

    node.properties.forEach(sprop => {
      if (t.isSpreadProperty(sprop)) {
        throw new Error('TODO: handle spread properties in spread properties');
      }

      keyedProps[sprop.key.name] = sprop.value.value;
    });
  }

  props.forEach(prop => {
    if (t.isSpreadProperty(prop)) {
      handleSpreadProperty(prop.get('argument').resolve().node);
    } else {
      // turn the key into a literal form
      const key = prop.toComputedKey();
      if (!t.isLiteral(key)) return; // probably computed

      // ensure that the value is a string
      const value = prop.get('value').resolve();
      if (!value.isLiteral()) return;

      // register property as one we'll try and autoprefix
      keyedProps[key.value] = value.node.value;
    }

    // remove property as it'll get added later again later
    prop.remove();
  });

  return keyedProps;
}

export default function ({ types: t }) {
  function getValue(value) {
    if (Array.isArray(value)) {
      return t.arrayExpression(value.map(getValue));
    } else if(isString(value)) {
      return t.stringLiteral(value);
    } else {
      throw new Error("Unknown type");
    }
  }

  function prefixStyle(path) {
    // verify this is an object as it's the only type we take
    if (!path.isObjectExpression()) return;

    // we've already prefixed this object
    if (path.getData('_autoprefixed')) return;

    // track that we've autoprefixed this so we don't do it multiple times
    path.setData('_autoprefixed', true);

    // get an object containing all the properties in this that are prefixed
    const prefixed = autoprefix(propertiesToObject(t, path.get('properties')));

    const props = Object.keys(prefixed).map((key) => {
      return t.objectProperty(
        t.identifier(key), getValue(prefixed[key])
      );
    });

    path.replaceWith(t.objectExpression(props));
  }

  return {
    visitor: {
      JSXAttribute(path) {
        if (isStyle(path.node)) {
          prefixStyle(path.get('value.expression').resolve(true));
        }
      }
    }
  };
}
