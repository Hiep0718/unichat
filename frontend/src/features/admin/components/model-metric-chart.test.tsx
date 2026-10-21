import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AiMeasurementChart } from './ai-measurement-chart';
import { ModelMetricChart } from './model-metric-chart';
import { modelMeasurementPath } from './model-measurement-path';

const model = 'deepseek-ai/deepseek-v4.1-flash';
const data = [{ date: '01', [model]: 0 }, { date: '02', [model]: null }, { date: '03', [model]: 20 }];
describe('ModelMetricChart', () => {
  afterEach(cleanup);
  it('should break the line at unknown usage and preserve a measured zero', () => {
    const path = modelMeasurementPath(data, model, 20);
    expect(path).toBe('M 45 172 M 620 20');
    expect(modelMeasurementPath([{ date: '01', [model]: null }], model, 20)).toBe('');
  });
  it('should use unique slash-safe SVG IDs and actual model labels', () => {
    const { container } = render(<><ModelMetricChart data={data} models={[model]} /><ModelMetricChart data={data} models={[model]} /></>);
    const identities = [...container.querySelectorAll('linearGradient')].map((gradient) => gradient.id);
    expect(new Set(identities).size).toBe(2);
    expect(identities.every((identity) => /^[A-Za-z0-9_-]+$/.test(identity))).toBe(true);
    expect(container.querySelector('path title')).toHaveTextContent(model);
    fireEvent.mouseEnter(container.querySelectorAll('rect')[1]!);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
  it('should distinguish null usage and known zero in the accessible measurements', () => {
    render(<AiMeasurementChart title="Tokens" data={data} series={[model]} />);
    expect(screen.getByRole('columnheader', { name: model })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '0' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '—' })).toBeInTheDocument();
  });
});
