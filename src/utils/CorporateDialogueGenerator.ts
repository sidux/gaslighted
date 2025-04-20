/**
 * Generates corporate jargon and processes dialogue templates
 */
export class CorporateDialogueGenerator {
  private buzzwords: string[] = [
    'synergy',
    'paradigm shift',
    'disruptive innovation',
    'leverage',
    'value-add',
    'best practice',
    'scalable',
    'mission-critical',
    'deliverables',
    'core competencies',
    'bandwidth',
    'touch base',
    'circle back',
    'deep dive',
    'action item',
    'low-hanging fruit',
    'move the needle',
    'get on the same page',
    'hit the ground running',
    'think outside the box',
    'streamline',
    'ecosystem',
    'holistic approach',
    'agile methodology',
    'bleeding edge',
    'ROI',
    'KPI',
    'pipeline',
    'drill down',
    'strategic partnership'
  ];
  
  private fillerPhrases: string[] = [
    'moving forward',
    'at the end of the day',
    'going forward',
    'in this space',
    'on my radar',
    'in the loop',
    'in Q{{quarter}}',
    'per our last conversation',
    'just to be clear',
    'from a {{department}} perspective',
    'with that being said',
    'in real time',
    'on a granular level',
    'with all due respect',
    'if you will',
    'if I may',
    'let me just say',
    'it goes without saying',
    'be that as it may',
    'it\'s a no-brainer'
  ];
  
  private corporatePhraseTemplates: string[] = [
    'We need to {{buzzword}} our {{buzzword}} to maximize {{buzzword}}.',
    'Let\'s {{buzzword}} before we {{buzzword}} {{fillerPhrase}}.',
    'I\'d like to {{buzzword}} this {{buzzword}} {{fillerPhrase}}.',
    'The {{department}} team will {{buzzword}} with the {{department}} department.',
    'Our {{buzzword}} strategy needs more {{buzzword}}.',
    'We should {{buzzword}} that conversation {{fillerPhrase}}.',
    'I\'ll {{buzzword}} those {{buzzword}} {{fillerPhrase}}.',
    'We need all hands on deck to {{buzzword}} this {{buzzword}}.',
    'Our {{buzzword}} metrics are {{performance}} {{fillerPhrase}}.',
    'Let\'s take this {{buzzword}} offline and {{buzzword}} later.',
    'The {{department}} KPIs show we need to {{buzzword}} our {{buzzword}}.',
    'We\'re not {{buzzword}} enough to {{buzzword}} the {{buzzword}}.',
    'I\'ll reach out to {{department}} to {{buzzword}} that {{buzzword}}.',
    'We need to {{buzzword}} our {{buzzword}} before EOD.',
    'That {{buzzword}} won\'t {{buzzword}} with our current {{buzzword}}.'
  ];
  
  private departments: string[] = [
    'marketing',
    'sales',
    'HR',
    'IT',
    'finance',
    'operations',
    'product',
    'legal',
    'customer success',
    'R&D'
  ];
  
  private performanceIndicators: string[] = [
    'up',
    'down',
    'flat',
    'trending upward',
    'concerning',
    'exceeding expectations',
    'below target',
    'at threshold',
    'off the charts',
    'underperforming'
  ];
  
  private quarters: string[] = ['1', '2', '3', '4'];
  
  public generateCorporatePhrase(): string {
    // Pick a random template
    const template = this.getRandomItem(this.corporatePhraseTemplates);
    
    // Process the template
    return this.processTemplate(template);
  }
  
  public processTemplate(template: string): string {
    let processedText = template;
    
    // Replace {{buzzword}} placeholders
    while (processedText.includes('{{buzzword}}')) {
      processedText = processedText.replace('{{buzzword}}', this.getRandomItem(this.buzzwords));
    }
    
    // Replace {{fillerPhrase}} placeholders
    while (processedText.includes('{{fillerPhrase}}')) {
      let fillerPhrase = this.getRandomItem(this.fillerPhrases);
      fillerPhrase = this.processTemplate(fillerPhrase); // Process nested templates
      processedText = processedText.replace('{{fillerPhrase}}', fillerPhrase);
    }
    
    // Replace {{department}} placeholders
    while (processedText.includes('{{department}}')) {
      processedText = processedText.replace('{{department}}', this.getRandomItem(this.departments));
    }
    
    // Replace {{performance}} placeholders
    while (processedText.includes('{{performance}}')) {
      processedText = processedText.replace('{{performance}}', this.getRandomItem(this.performanceIndicators));
    }
    
    // Replace {{quarter}} placeholders
    while (processedText.includes('{{quarter}}')) {
      processedText = processedText.replace('{{quarter}}', this.getRandomItem(this.quarters));
    }
    
    return processedText;
  }
  
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
