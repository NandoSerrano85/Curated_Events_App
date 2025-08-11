import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../../utils/testUtils';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    renderWithProviders(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center');
  });

  it('handles different variants', () => {
    const { rerender } = renderWithProviders(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:bg-gray-100');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('handles different sizes', () => {
    const { rerender } = renderWithProviders(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('handles disabled state', () => {
    renderWithProviders(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles loading state', () => {
    renderWithProviders(<Button loading>Loading</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Loading');
    
    // Check for loading spinner
    const spinner = button.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('handles full width prop', () => {
    renderWithProviders(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const { user } = renderWithProviders(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', async () => {
    const handleClick = vi.fn();
    const { user } = renderWithProviders(
      <Button onClick={handleClick} disabled>Disabled</Button>
    );
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with icon', () => {
    const icon = <span data-testid="test-icon">🚀</span>;
    renderWithProviders(<Button icon={icon}>With Icon</Button>);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('🚀With Icon');
  });

  it('positions icon correctly', () => {
    const icon = <span data-testid="test-icon">🚀</span>;
    
    const { rerender } = renderWithProviders(
      <Button icon={icon} iconPosition="left">Left Icon</Button>
    );
    
    let iconElement = screen.getByTestId('test-icon');
    expect(iconElement.parentElement).toHaveClass('mr-2');

    rerender(<Button icon={icon} iconPosition="right">Right Icon</Button>);
    iconElement = screen.getByTestId('test-icon');
    expect(iconElement.parentElement).toHaveClass('ml-2');
  });

  it('handles different button types', () => {
    const { rerender } = renderWithProviders(<Button type="button">Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');

    rerender(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

    rerender(<Button type="reset">Reset</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });

  it('applies custom className', () => {
    renderWithProviders(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('sets testId attribute', () => {
    renderWithProviders(<Button testId="custom-button">Test</Button>);
    expect(screen.getByTestId('custom-button')).toBeInTheDocument();
  });

  it('combines multiple props correctly', async () => {
    const handleClick = vi.fn();
    const icon = <span data-testid="test-icon">🚀</span>;
    const { user } = renderWithProviders(
      <Button
        variant="primary"
        size="lg"
        fullWidth
        icon={icon}
        iconPosition="left"
        onClick={handleClick}
        className="custom-class"
        testId="complex-button"
      >
        Complex Button
      </Button>
    );
    
    const button = screen.getByTestId('complex-button');
    
    // Check all applied classes and attributes
    expect(button).toHaveClass('bg-blue-600', 'px-6', 'py-3', 'w-full', 'custom-class');
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    
    // Test functionality
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});