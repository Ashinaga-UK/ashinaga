'use client';

import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from '../lib/auth-client';
import { useUpdateUser } from '../lib/hooks/use-queries';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';

interface MyProfileProps {
  onBack: () => void;
}

export function MyProfile({ onBack }: MyProfileProps) {
  const session = useSession();
  const { toast } = useToast();
  const updateUserMutation = useUpdateUser();
  const user = session.data?.user;

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    updateUserMutation.mutate(
      {
        name: profileData.name,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Your profile has been updated successfully.',
          });
          setIsEditing(false);
        },
        onError: (error) => {
          console.error('Error updating profile:', error);
          toast({
            title: 'Error',
            description: 'Failed to update profile. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Manage your personal information and account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-lg bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 text-white">
                {profileData.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{profileData.name}</h3>
              <p className="text-sm text-gray-600">{profileData.email}</p>
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                title="Email cannot be changed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending}
                  className="bg-gradient-to-r from-ashinaga-teal-600 to-ashinaga-green-600 hover:from-ashinaga-teal-700 hover:to-ashinaga-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
