import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '../../components/separator';

const meta = {
  title: 'UI/Layout/Separator',
  component: Separator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[400px]">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Radix Primitives</h4>
        <p className="text-sm text-muted-foreground">An open-source UI component library.</p>
      </div>
      <Separator className="my-4" />
      <div className="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <Separator orientation="vertical" />
        <div>Docs</div>
        <Separator orientation="vertical" />
        <div>Source</div>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center space-x-4 text-sm">
      <div>Blog</div>
      <Separator orientation="vertical" />
      <div>Docs</div>
      <Separator orientation="vertical" />
      <div>Source</div>
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="w-[400px]">
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>
    </div>
  ),
};

export const InForm: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div>
        <h3 className="text-lg font-medium">Personal Information</h3>
        <p className="text-sm text-muted-foreground">Update your personal details here.</p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">First name</label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last name</label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="Doe"
            />
          </div>
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">Manage your account preferences.</p>
      </div>
    </div>
  ),
};

export const Decorative: Story = {
  render: () => (
    <div className="w-[400px] space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Section Title</h2>
        <Separator decorative />
        <p className="text-muted-foreground">
          This separator is decorative and doesn't have semantic meaning.
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Settings</h3>
          <span className="text-sm text-muted-foreground">v1.0.0</span>
        </div>
        <Separator decorative />
        <div className="space-y-2">
          <p className="text-sm">Configure your preferences below.</p>
        </div>
      </div>
    </div>
  ),
};
