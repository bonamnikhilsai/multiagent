"""
graph.py — LangGraph adversarial cyclic state machine.
Defines the N-round debate workflow: Researcher <-> Critic -> Synthesizer.
Full debate history is tracked and passed to the Synthesizer for complete analysis.
"""

from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from agents import (
    get_researcher_model,
    get_critic_model,
    get_synthesizer_model,
    RESEARCHER_SYSTEM,
    CRITIC_SYSTEM,
    SYNTHESIZER_SYSTEM,
)


class DebateRound(TypedDict):
    round_num: int
    researcher_text: str
    critic_text: str


class DebateState(TypedDict):
    history: list[dict]          # Prior conversation history (multi-turn sessions)
    query: str                    # The user's architectural question
    researcher_output: str        # Latest researcher output
    critic_output: str            # Latest critic output
    current_round: int            # Current debate round (1-indexed)
    max_rounds: int               # Total rounds configured (default: 3)
    debate_log: list[DebateRound] # Full structured log of all rounds
    final_synthesis: str          # Synthesizer's final verdict


async def researcher_node(state: DebateState) -> dict:
    """Node A: The Researcher — optimistic senior solution architect."""
    model = get_researcher_model()

    # Build conversation context from prior session history
    context_messages = []
    for h in state.get("history", []):
        if h["role"] == "user":
            context_messages.append(HumanMessage(content=h["content"]))
        else:
            context_messages.append(AIMessage(content=h["content"]))

    # Build the prompt for this round
    round_num = state["current_round"]
    max_rounds = state["max_rounds"]

    prompt_parts = [
        f"TOPIC: {state['query']}",
        f"ARCHITECTURAL QUERY: {state['query']}",
        f"DEBATE ROUND: {round_num} of {max_rounds}",
        f"DEBATE FLOW: Round {round_num} — RESEARCHER presents/defends",
    ]

    # In rounds 2+, include the critic's previous attack for the Researcher to defend against
    if state.get("critic_output"):
        prompt_parts.append(f"\n=== CRITIC'S PREVIOUS ATTACK (Round {round_num - 1}) ===\n{state['critic_output']}")
        prompt_parts.append(f"\nNow provide your Round {round_num} defense. Fill in the 'Defense' section directly addressing the above attacks.")
    else:
        prompt_parts.append("\nThis is Round 1. Present your initial architectural case. Write 'N/A — Initial Presentation' for the Defense section.")

    messages = [
        SystemMessage(content=RESEARCHER_SYSTEM),
        *context_messages,
        HumanMessage(content="\n".join(prompt_parts)),
    ]

    response = await model.ainvoke(messages)
    return {"researcher_output": response.content}


async def critic_node(state: DebateState) -> dict:
    """Node B: The Critic — aggressive, battle-hardened systems reviewer."""
    model = get_critic_model()

    round_num = state["current_round"]
    max_rounds = state["max_rounds"]

    # Include the full debate log so the Critic can escalate pressure
    debate_context = ""
    for past_round in state.get("debate_log", []):
        debate_context += f"\n--- Round {past_round['round_num']} Researcher ---\n{past_round['researcher_text']}"
        if past_round.get("critic_text"):
            debate_context += f"\n--- Round {past_round['round_num']} Critic ---\n{past_round['critic_text']}"

    prompt = (
        f"TOPIC: {state['query']}\n"
        f"ARCHITECTURAL QUERY: {state['query']}\n"
        f"DEBATE ROUND: {round_num} of {max_rounds}\n"
        f"DEBATE FLOW: Round {round_num} — CRITIC attacks\n"
    )

    if debate_context:
        prompt += f"\n=== FULL DEBATE HISTORY SO FAR ==={debate_context}\n"

    prompt += (
        f"\n=== RESEARCHER'S ROUND {round_num} ARGUMENT ===\n"
        f"{state['researcher_output']}\n\n"
        f"Now deliver your Round {round_num} critique. "
        f"{'This is the FINAL round — make your most devastating technical objection.' if round_num == max_rounds else 'Escalate your pressure from the previous round.'}"
    )

    messages = [
        SystemMessage(content=CRITIC_SYSTEM),
        HumanMessage(content=prompt),
    ]

    response = await model.ainvoke(messages)

    # Append this round to the debate log
    new_round: DebateRound = {
        "round_num": round_num,
        "researcher_text": state["researcher_output"],
        "critic_text": response.content,
    }
    updated_log = list(state.get("debate_log", [])) + [new_round]

    return {
        "critic_output": response.content,
        "current_round": round_num + 1,
        "debate_log": updated_log,
    }


async def synthesizer_node(state: DebateState) -> dict:
    """Node C: The Synthesizer — ultimate judge, code generator, and verdict provider."""
    model = get_synthesizer_model()

    # Build the complete transcript for the Synthesizer
    full_transcript = f"ARCHITECTURAL QUERY: {state['query']}\n\n"
    full_transcript += f"DEBATE CONFIGURATION: {state['max_rounds']} rounds\n\n"

    for past_round in state.get("debate_log", []):
        full_transcript += f"{'='*60}\nROUND {past_round['round_num']} — RESEARCHER:\n{'='*60}\n"
        full_transcript += past_round["researcher_text"] + "\n\n"
        full_transcript += f"{'='*60}\nROUND {past_round['round_num']} — CRITIC:\n{'='*60}\n"
        full_transcript += past_round["critic_text"] + "\n\n"

    prompt = (
        f"TOPIC: {state['query']}\n\n"
        f"{full_transcript}\n"
        f"{'='*60}\nFINAL PHASE — SYNTHESIZER DIRECTIVE\n{'='*60}\n"
        f"You have now read the complete {state['max_rounds']}-round debate. "
        f"Deliver the final engineering verdict. Select a definitive WINNER. "
        f"Identify the most convincing arguments on both sides. "
        f"Produce the definitive production-ready JavaScript solution with complete boilerplate code. "
        f"REMEMBER: Generate ONLY JavaScript. No TypeScript."
    )

    messages = [
        SystemMessage(content=SYNTHESIZER_SYSTEM),
        HumanMessage(content=prompt),
    ]

    response = await model.ainvoke(messages)
    return {"final_synthesis": response.content}


def should_continue(state: DebateState) -> str:
    """Router: loop back to Researcher if rounds remain, otherwise go to Synthesizer."""
    # current_round is incremented by the critic_node AFTER it runs
    # So after critic finishes round N, current_round becomes N+1
    # If N+1 > max_rounds, we move to synthesizer
    if state["current_round"] <= state["max_rounds"]:
        return "researcher"
    return "synthesizer"


def build_debate_graph():
    """Construct and compile the adversarial debate state graph."""
    workflow = StateGraph(DebateState)

    workflow.add_node("researcher", researcher_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("synthesizer", synthesizer_node)

    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "critic")
    workflow.add_conditional_edges("critic", should_continue)
    workflow.add_edge("synthesizer", END)

    return workflow.compile()


debate_graph = build_debate_graph()
