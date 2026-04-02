/**
 * Unit tests for StepPlanSelect component
 * Validates: Requirements 4.1–4.4
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import StepPlanSelect from '../components/register/StepPlanSelect';
import type { Plan } from '../types';

afterEach(() => {
  cleanup();
});

describe('StepPlanSelect — plan prices and mailbox counts', () => {
  it('renders Starter plan at $3/mo with 1 mailbox', () => {
    render(
      <StepPlanSelect path="B" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('plan-price-starter')).toHaveTextContent('$3/mo');
    expect(screen.getByTestId('plan-mailboxes-starter')).toHaveTextContent('1 mailbox included');
  });

  it('renders Business plan at $10/mo with 5 mailboxes', () => {
    render(
      <StepPlanSelect path="B" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('plan-price-business')).toHaveTextContent('$10/mo');
    expect(screen.getByTestId('plan-mailboxes-business')).toHaveTextContent('5 mailboxes included');
  });

  it('renders Pro plan at $18/mo with 10 mailboxes', () => {
    render(
      <StepPlanSelect path="B" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('plan-price-pro')).toHaveTextContent('$18/mo');
    expect(screen.getByTestId('plan-mailboxes-pro')).toHaveTextContent('10 mailboxes included');
  });
});

describe('StepPlanSelect — domain fee visibility', () => {
  it('shows $5 domain fee on all plan cards for Path A', () => {
    render(
      <StepPlanSelect path="A" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('plan-domain-fee-starter')).toBeInTheDocument();
    expect(screen.getByTestId('plan-domain-fee-business')).toBeInTheDocument();
    expect(screen.getByTestId('plan-domain-fee-pro')).toBeInTheDocument();
  });

  it('does not show domain fee for Path B', () => {
    render(
      <StepPlanSelect path="B" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.queryByTestId('plan-domain-fee-starter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-domain-fee-business')).not.toBeInTheDocument();
    expect(screen.queryByTestId('plan-domain-fee-pro')).not.toBeInTheDocument();
  });

  it('Path A Starter total is $8 (3 + 5)', () => {
    render(
      <StepPlanSelect path="A" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('plan-total-starter')).toHaveTextContent('$8');
  });

  it('Path B Starter total is $3', () => {
    render(
      <StepPlanSelect path="B" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('plan-total-starter')).toHaveTextContent('$3');
  });
});

describe('StepPlanSelect — plan selection and Continue button', () => {
  it('Continue button is disabled when no plan is selected', () => {
    render(
      <StepPlanSelect path="B" selectedPlan={null} onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('btn-next')).toBeDisabled();
  });

  it('Continue button is enabled when a plan is selected', () => {
    render(
      <StepPlanSelect path="B" selectedPlan="business" onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('btn-next')).not.toBeDisabled();
  });

  it('calls onPlanSelect with the correct plan when a card is clicked', () => {
    const onPlanSelect = vi.fn();
    render(
      <StepPlanSelect path="B" selectedPlan={null} onPlanSelect={onPlanSelect} onNext={() => {}} />
    );
    fireEvent.click(screen.getByTestId('plan-card-business'));
    expect(onPlanSelect).toHaveBeenCalledWith('business');
  });

  it('calls onNext when Continue is clicked with a plan selected', () => {
    const onNext = vi.fn();
    render(
      <StepPlanSelect path="B" selectedPlan="pro" onPlanSelect={() => {}} onNext={onNext} />
    );
    fireEvent.click(screen.getByTestId('btn-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('highlights selected plan card with aria-pressed=true', () => {
    render(
      <StepPlanSelect path="B" selectedPlan="starter" onPlanSelect={() => {}} onNext={() => {}} />
    );
    expect(screen.getByTestId('plan-card-starter')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('plan-card-business')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('plan-card-pro')).toHaveAttribute('aria-pressed', 'false');
  });
});
