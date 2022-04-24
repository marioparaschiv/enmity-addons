export default function findInReactTree(tree: object = {}, filter: Function = _ => _, { ignore = [], walkable = ['props', 'children'], maxProperties = 100 } = {}) {
   const stack: object[] = [tree];
   const wrapFilter: Function = function (...args): any {
      try {
         return Reflect.apply(filter, this, args);
      } catch {
         return false;
      }
   };

   while (stack.length && maxProperties) {
      const node = stack.shift();
      if (wrapFilter(node)) return node;

      if (Array.isArray(node)) {
         stack.push(...node);
      } else if (typeof node === 'object' && node !== null) {
         if (walkable.length) {
            for (const key in node) {
               const value = node[key];
               if (~walkable.indexOf(key) && !~ignore.indexOf(key)) {
                  stack.push(value);
               }
            }
         } else {
            for (const key in node) {
               const value = node[key];
               if (node && ~ignore.indexOf(key)) continue;

               stack.push(value);
            }
         }
      }
      maxProperties--;
   }
};