export class ReverseGenerator {
  private static readonly easyWords = [
    'cat', 'dog', 'sun', 'moon', 'star', 'fish', 'bird', 'tree',
    'ball', 'book', 'door', 'lamp', 'rock', 'leaf', 'wind', 'fire',
    'ice', 'sky', 'sea', 'fog', 'rain', 'snow', 'bear', 'wolf',
    'coin', 'key', 'cup', 'pen', 'box', 'hat', 'map', 'web'
  ];

  private static readonly mediumWords = [
    'apple', 'house', 'water', 'bread', 'ocean', 'river', 'tiger', 'eagle',
    'storm', 'cloud', 'flame', 'frost', 'stone', 'metal', 'glass', 'paper',
    'forest', 'desert', 'valley', 'castle', 'bridge', 'garden', 'market', 'temple',
    'dragon', 'wizard', 'knight', 'shield', 'sword', 'crown', 'jewel', 'crystal',
    'planet', 'galaxy', 'comet', 'nebula', 'cipher', 'enigma', 'puzzle', 'riddle',
    'shadow', 'mirror', 'portal', 'beacon', 'anchor', 'compass', 'lantern', 'prism'
  ];

  private static readonly hardWords = [
    'typescript', 'javascript', 'encryption', 'cryptography', 'algorithm', 'infrastructure',
    'architecture', 'authentication', 'authorization', 'vulnerability', 'cybersecurity',
    'blockchain', 'metamorphosis', 'constellation', 'synchronization', 'transformation',
    'illumination', 'orchestration', 'denomination', 'comprehension', 'manifestation',
    'extraordinary', 'revolutionary', 'sophisticated', 'kaleidoscope', 'optimization',
    'crystallization', 'configuration', 'implementation', 'parallelization', 'serialization',
    'decentralization', 'internationalization', 'containerization', 'virtualization',
    'obfuscation', 'triangulation', 'interpolation', 'extrapolation', 'approximation',
    'segmentation', 'fragmentation', 'concatenation', 'regeneration', 'degeneration'
  ];

  static generate(difficulty: 'easy' | 'medium' | 'hard'): { question: string; answer: string } {
    let wordPool: string[];
    
    if (difficulty === 'easy') {
      wordPool = this.easyWords;
    }
    
    if (difficulty === 'medium') {
      wordPool = this.mediumWords;
    }
    
    if (difficulty === 'hard') {
      wordPool = this.hardWords;
    }
    
    const text = wordPool![Math.floor(Math.random() * wordPool!.length)]!;
    const reversed = text.split('').reverse().join('');
    
    return { question: reversed, answer: text };
  }
}