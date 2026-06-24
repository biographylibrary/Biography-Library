declare module 'hypher' {
  export default class Hypher {
    constructor(pattern: object);
    hyphenate(word: string): string[];
  }
}

declare module 'hyphenation.en-us' {
  const pattern: object;
  export default pattern;
}

declare module 'hyphenation.it' {
  const pattern: object;
  export default pattern;
}

declare module 'hyphenation.de' {
  const pattern: object;
  export default pattern;
}

declare module 'hyphenation.fr' {
  const pattern: object;
  export default pattern;
}
