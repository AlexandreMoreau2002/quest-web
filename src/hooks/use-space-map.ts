'use client';

import { useCallback, useEffect, useState } from 'react';

import { QuestApiClient, type CreateNodeInput } from '@/lib/api/client';
import { fallbackSpace } from '@/lib/map/fallback';
import type { SpaceGraph, SpaceNode } from '@/lib/map/graph';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useSpaceMap() {
  const [graph, setGraph] = useState<SpaceGraph>(fallbackSpace);
  const [source, setSource] = useState<'local' | 'api'>('local');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    new QuestApiClient(API_URL)
      .loadFirstSpace()
      .then((apiGraph) => {
        if (!active) return;
        setGraph(apiGraph);
        setSelectedNodeId(apiGraph.nodes[0]?.id ?? null);
        setSource('api');
      })
      .catch(() => {
        // The interactive demo remains useful before the Nest API is running.
      });
    return () => {
      active = false;
    };
  }, []);

  const createNode = useCallback(async (input: CreateNodeInput): Promise<SpaceNode | null> => {
    const title = input.title.trim();
    if (!title) return null;

    if (source === 'api') {
      try {
        const node = await new QuestApiClient(API_URL).createNode(graph.id, { ...input, title });
        setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
        setSelectedNodeId(node.id);
        setError(null);
        return node;
      } catch {
        setError('Le nœud n\'a pas pu être créé.');
        return null;
      }
    }

    const node: SpaceNode = { id: `local-${Date.now()}`, type: input.type, title, status: 'active', positionX: input.positionX ?? 0, positionY: input.positionY ?? 0 };
    setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelectedNodeId(node.id);
    return node;
  }, [graph.id, source]);

  const updateNodePosition = useCallback(async (nodeId: string, positionX: number, positionY: number) => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === nodeId ? { ...node, positionX, positionY } : node),
    }));
    if (source === 'api') {
      try {
        await new QuestApiClient(API_URL).updateNode(nodeId, { positionX, positionY });
      } catch {
        setError('La position n\'a pas pu être enregistrée.');
      }
    }
  }, [source]);

  const updateNodeStatus = useCallback(async (nodeId: string, status: SpaceNode['status']) => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === nodeId ? { ...node, status } : node),
    }));
    if (source === 'api') {
      try {
        await new QuestApiClient(API_URL).updateNode(nodeId, { status });
      } catch {
        setError('Le statut n\'a pas pu être enregistré.');
      }
    }
  }, [source]);

  const updateNodeTitle = useCallback(async (nodeId: string, nextTitle: string) => {
    const title = nextTitle.trim();
    if (!title) return false;

    const previous = graph.nodes.find((node) => node.id === nodeId);
    if (!previous) return false;

    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === nodeId ? { ...node, title } : node),
    }));

    if (source !== 'api') {
      return true;
    }

    try {
      const updated = await new QuestApiClient(API_URL).updateNode(nodeId, { title });
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => node.id === nodeId ? updated : node),
      }));
      setError(null);
      return true;
    } catch {
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => {
          if (node.id !== nodeId) return node;
          return node.title === title ? { ...node, title: previous.title } : node;
        }),
      }));
      setError('Le titre n\'a pas pu être enregistré.');
      return false;
    }
  }, [graph.nodes, source]);

  const validateObjectif = useCallback(async (nodeId: string) => {
    if (source !== 'api') {
      setError('La validation nécessite l\'API.');
      return;
    }
    try {
      const node = await new QuestApiClient(API_URL).validateObjectif(nodeId);
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((existing) => existing.id === nodeId ? node : existing),
      }));
      setError(null);
    } catch {
      setError('La validation a échoué.');
    }
  }, [source]);

  const linkNodes = useCallback(async (sourceNodeId: string, targetNodeId: string) => {
    if (source !== 'api') {
      setError('La création de lien nécessite l\'API.');
      return;
    }
    try {
      const edge = await new QuestApiClient(API_URL).createEdge(graph.id, { sourceNodeId, targetNodeId });
      setGraph((current) => ({ ...current, edges: [...current.edges, edge] }));
      setError(null);
    } catch {
      setError('Le lien n\'a pas pu être créé.');
    }
  }, [graph.id, source]);

  const unlinkEdge = useCallback(async (edgeId: string) => {
    setGraph((current) => ({ ...current, edges: current.edges.filter((edge) => edge.id !== edgeId) }));
    if (source === 'api') {
      try {
        await new QuestApiClient(API_URL).deleteEdge(edgeId);
      } catch {
        setError('La suppression du lien a échoué.');
      }
    }
  }, [source]);

  const removeNode = useCallback(async (nodeId: string) => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      edges: current.edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId),
    }));
    setSelectedNodeId((current) => current === nodeId ? null : current);
    if (source === 'api') {
      try {
        await new QuestApiClient(API_URL).deleteNode(nodeId);
      } catch {
        setError('La suppression a échoué.');
      }
    }
  }, [source]);

  return {
    graph,
    source,
    error,
    selectedNodeId,
    selectNode: setSelectedNodeId,
    createNode,
    updateNodePosition,
    updateNodeStatus,
    updateNodeTitle,
    validateObjectif,
    linkNodes,
    unlinkEdge,
    removeNode,
  };
}
