import { MCPPromptDefinition } from "../types/mcp";
import { logger } from "../utils/logger";
import { SimulatorManager } from "../managers/SimulatorManager";
import {
  createSimulatorPrompts,
  RegisteredPrompt,
} from "../prompts/SimulatorPrompts";

export class PromptRegistry {
  private prompts: Map<string, RegisteredPrompt> = new Map();
  private registryLogger = logger.createChildLogger("PromptRegistry");

  async initializePrompts(simulatorManager: SimulatorManager): Promise<void> {
    this.registryLogger.info("Initializing prompts...");

    // Register simulator prompts
    const simulatorPrompts = createSimulatorPrompts(simulatorManager);
    for (const prompt of simulatorPrompts) {
      this.registerPrompt(prompt);
    }

    this.registryLogger.info(
      `Successfully initialized ${this.prompts.size} prompts`
    );
  }

  private registerPrompt(prompt: RegisteredPrompt): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt with name "${prompt.name}" already registered`);
    }

    this.prompts.set(prompt.name, prompt);
    this.registryLogger.debug(`Registered prompt: ${prompt.name}`);
  }

  getAllPrompts(): MCPPromptDefinition[] {
    return Array.from(this.prompts.values()).map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    }));
  }

  getPrompt(name: string): RegisteredPrompt | undefined {
    return this.prompts.get(name);
  }

  hasPrompt(name: string): boolean {
    return this.prompts.has(name);
  }

  getPromptCount(): number {
    return this.prompts.size;
  }
}
